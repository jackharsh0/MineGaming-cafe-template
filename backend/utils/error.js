function handleError(res, err, defaultMessage = 'An unexpected error occurred') {
  console.error(err);
  
  // Clean DB or internal system runtime errors to avoid leaking stack traces / schema details
  const isDbError = !!(err.code || err.errno || err.sqlState || err.sql);
  const isSystemError = err instanceof TypeError || err instanceof ReferenceError || err instanceof SyntaxError || isDbError;
  
  const message = isSystemError ? defaultMessage : err.message;
  res.status(err.statusCode || 500).json({ success: false, message });
}

module.exports = {
  handleError
};
