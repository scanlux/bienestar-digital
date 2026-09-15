const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const { UPLOAD_DIR } = require('../config/env');

// Background Video Processing Queue
const videoQueue = [];
let activeJobs = 0;
const MAX_CONCURRENT_JOBS = 2;

function enqueueVideoJob(job) {
  videoQueue.push(job);
  console.log(`[QUEUE] Job enqueued for video ID ${job.videoId}. Queue length: ${videoQueue.length}`);
  processNextJob();
}

function processNextJob() {
  if (activeJobs >= MAX_CONCURRENT_JOBS || videoQueue.length === 0) {
    return;
  }

  const job = videoQueue.shift();
  activeJobs++;

  console.log(`[QUEUE] Starting processing of video ID ${job.videoId}. Active jobs: ${activeJobs}`);
  
  transcodeVideo(job)
    .catch(err => {
      console.error(`[QUEUE ERROR] Job failed for video ID ${job.videoId}:`, err);
    })
    .finally(() => {
      activeJobs--;
      console.log(`[QUEUE] Finished processing of video ID ${job.videoId}. Active jobs: ${activeJobs}`);
      processNextJob();
    });
}

async function activateVideoOnBackend(videoId, urls, authHeader) {
  const backendUrl = process.env.BACKEND_URL || 'http://100.127.144.125:4000';
  const url = `${backendUrl}/api/manage/videos/${videoId}/active`;

  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(urls)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.error(`[ERROR] Failed to activate video ${videoId} on USA backend:`, err.message);
    throw err;
  }
}

async function transcodeVideo(job) {
  const { videoId, commerceId, rawPath, authHeader } = job;
  const videosDir = path.join(UPLOAD_DIR, 'videos');

  const highPath = path.join(videosDir, `high_${videoId}.mp4`);
  const lowPath = path.join(videosDir, `low_${videoId}.mp4`);
  const midPath = path.join(videosDir, `mid_${videoId}.mp4`);

  try {
    // 1. Alta (1080p) - movflags +faststart, scale=1080:-2, threads=1
    console.log(`[QUEUE] High Quality (1080p) transcoding for video ID ${videoId}...`);
    const cmdHigh = `ffmpeg -y -i "${rawPath}" -threads 1 -c:v libx264 -preset fast -crf 23 -vf "scale=1080:-2" -c:a aac -b:a 128k -movflags +faststart "${highPath}"`;
    await execPromise(cmdHigh);
    console.log(`[QUEUE] High Quality transcoding completed for video ID ${videoId}.`);

    const urlHigh = `https://trendy-telemetry.sytes.net/uploads/videos/high_${videoId}.mp4`;
    const urlLow = `https://trendy-telemetry.sytes.net/uploads/videos/low_${videoId}.mp4`;
    const urlMid = `https://trendy-telemetry.sytes.net/uploads/videos/mid_${videoId}.mp4`;

    console.log(`[QUEUE] Sending High Quality activation to backend for video ID ${videoId}...`);
    await activateVideoOnBackend(videoId, { url_high: urlHigh, url_low: '', url_mid: '', commerceId }, authHeader);
    console.log(`[QUEUE] High Quality activation complete for video ID ${videoId}.`);

    // 2. Baja (480p) - scale=480:-2, threads=1
    console.log(`[QUEUE] Low Quality (480p) transcoding for video ID ${videoId}...`);
    const cmdLow = `ffmpeg -y -i "${rawPath}" -threads 1 -c:v libx264 -preset fast -crf 28 -vf "scale=480:-2" -c:a aac -b:a 96k -movflags +faststart "${lowPath}"`;
    await execPromise(cmdLow);
    console.log(`[QUEUE] Low Quality transcoding completed for video ID ${videoId}.`);

    // Update with url_low
    await activateVideoOnBackend(videoId, { url_high: urlHigh, url_low: urlLow, url_mid: '', commerceId }, authHeader);

    // 3. Media (720p) - scale=720:-2, threads=1
    console.log(`[QUEUE] Mid Quality (720p) transcoding for video ID ${videoId}...`);
    const cmdMid = `ffmpeg -y -i "${rawPath}" -threads 1 -c:v libx264 -preset fast -crf 25 -vf "scale=720:-2" -c:a aac -b:a 128k -movflags +faststart "${midPath}"`;
    await execPromise(cmdMid);
    console.log(`[QUEUE] Mid Quality transcoding completed for video ID ${videoId}.`);

    // Update with url_mid
    await activateVideoOnBackend(videoId, { url_high: urlHigh, url_low: urlLow, url_mid: urlMid, commerceId }, authHeader);
    console.log(`[QUEUE] Full progressive transcoding workflow completed for video ID ${videoId}.`);

    // Cleanup raw video file
    if (fs.existsSync(rawPath)) {
      fs.unlinkSync(rawPath);
      console.log(`[QUEUE] Cleaned up raw file for video ID ${videoId}: ${rawPath}`);
    }
  } catch (err) {
    console.error(`[QUEUE ERROR] Failed during transcoding steps for video ID ${videoId}:`, err.message);
    throw err;
  }
}

module.exports = {
  enqueueVideoJob,
  processNextJob,
  activateVideoOnBackend,
  transcodeVideo
};
