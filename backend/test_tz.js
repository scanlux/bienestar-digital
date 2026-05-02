const nowBogotaStr = new Date().toLocaleString("en-US", { timeZone: "America/Bogota" });
const nowBogota = new Date(nowBogotaStr);
const currentDay = nowBogota.getDay(); 
const currentHours = String(nowBogota.getHours()).padStart(2, '0');
const currentMinutes = String(nowBogota.getMinutes()).padStart(2, '0');
const currentSeconds = String(nowBogota.getSeconds()).padStart(2, '0');
const currentTimeStr = `${currentHours}:${currentMinutes}:${currentSeconds}`;

console.log({
    nowBogotaStr,
    currentDay,
    currentTimeStr
});
