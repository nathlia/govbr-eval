(function (window) {
   window.__env = window.__env || {};
    window.__env.profile = '${PROFILE}'
   // API url
   window.__env.url = {
      api: '${URL_API}',
      apiOleoDiesel: '${URL_API_OLEO_DIESEL}',
      home: '${URL_HOME}',
      documentos: '${URL_DOCUMENTOS}'
   };

      //auth2 keycloak
   window.__env.keycloak = {
      url: "${KEYCLOAK_URL}",
      realm: "${KEYCLOAK_REALM}",
      clientId: "${KEYCLOAK_CLIENT}"
   };
      //gov
      window.__env.signGov = {
         url: "${SIGN_URL}",
         clientId: "${SIGN_CLIENT}",
         certificado: "${SIGN_CERT}",
         confiabilidade: "${SIGN_CONF}",
         confiabilidadeAcesso: "${SIGN_CONF_ACESS}",
         logout: "${SIGN_LOGOUT}"
      };

}(this));
