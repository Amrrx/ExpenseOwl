export default ({ config }) => {
  return {
    ...config,
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.19:8080',
      googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '623474088890-3bdjpiptpitsvugn1iojq284ir6m0r3t.apps.googleusercontent.com',
      eas: {
        projectId: process.env.EAS_PROJECT_ID || undefined,
      },
    },
  };
};
