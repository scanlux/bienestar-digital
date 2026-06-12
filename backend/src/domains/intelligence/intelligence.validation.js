const saveStopWordsSchema = {
  word: { type: 'string', required: true }
};

const generateTagsSchema = {
  limit: { type: 'number', required: false },
  offset: { type: 'number', required: false }
};

module.exports = {
  saveStopWordsSchema,
  generateTagsSchema
};
