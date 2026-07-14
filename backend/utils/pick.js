module.exports = (source, allowedFields) => allowedFields.reduce((result, field) => {
  if (Object.prototype.hasOwnProperty.call(source, field) && source[field] !== undefined) {
    result[field] = source[field];
  }
  return result;
}, {});
