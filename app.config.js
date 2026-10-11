module.exports = ({ config }) => {
  const isProduction =
    process.env.APP_VARIANT === 'production' ||
    process.env.NODE_ENV === 'production';

  return {
    ...config,
    name: isProduction ? 'Dev Mode' : 'Dev Mode Dev',
    android: {
      ...(config.android || {}),
      package: isProduction ? 'com.devmode.app' : 'com.devmode.app.dev',
    },
  };
};

