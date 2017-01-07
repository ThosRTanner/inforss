// Another XpiInstaller
// By MonkeeSage
// (Heavily inspired by code from Pike, who was...)
// (Heavily inspired by code from Henrik Gemal and Stephen Clavering)

var XpiInstaller = {

   // --- Editable items begin ---
   extFullName    : 'infoRSS', // The name displayed to the user (don't include the version)
   extShortName   : 'inforss', // The leafname of the JAR file (without the .jar part)
   extVersion     : '1.4.1',
   extAuthor      : 'Didier Ernotte',
   extGuid        : '{f65bf62a-5ffc-4317-9612-38907a779583}',
   extLocaleNames : ['en-US', 'fr-FR', 'sv-SE', 'de-DE', 'de-AT', 'it-IT', 'sq-AL', 'pt-BR', 'nl-NL', 'es-ES', 'bg-BG', 'ja-JP', 'da-DK', 'zh-TW', 'zh-CN', 'cs-CZ', 'pl-PL', 'ru-RU', 'sl-SI', 'fi-FI', 'hu-HU', 'sr-YU', 'sr-RS', 'sk-SK', 'ko-KR', 'tr-TR', 'el-GR', 'uk-UA', 'ro-RO', 'eu-ES', 'he-IL'], // e.g., ['en-US', 'en-GB']
   extSkinNames   : ['classic'], // e.g., ['classic', 'modern']
 //  extPreferences : ['prefs.js'], // e.g., ['extension.js']
   extPreferences : null, // e.g., ['extension.js']
   extPostInstallMessage: 'You need to restart your browser before the extension will work.', // Set to null for no post-install message
   // --- Editable items end ---

   profileInstall : true,
   silentInstall  : false,

   install: function() {

      var jarName    = this.extShortName + '.jar';
      var defaultRepository = "inforss.default";
	  var mainDir = getFolder("Profile", "extensions/" + this.extGuid);
	  var chromeDir = getFolder(mainDir, "chrome");
      var globalDir  = Install.getFolder('Chrome');

      // Parse HTTP arguments
      this.parseArguments();
      // Check if extension is already installed in profile
      if (File.exists(Install.getFolder(chromeDir, jarName))) {
         if (!this.silentInstall) {
            Install.alert('Updating existing Profile install of ' +
                          this.extFullName + ' to version ' + this.extVersion + '.');
         }
         this.profileInstall = true;
      }
      else if (!this.silentInstall) {
         // Ask user for install location, profile or browser dir?
         this.profileInstall = Install.confirm('Install ' + this.extFullName + ' ' +
                               this.extVersion + ' to the Profile directory [OK] or ' +
                               'the Browser directory [Cancel]?');
      }

      // Init install
      var dispName = this.extFullName + ' ' + this.extVersion;
      var regName  = '/' + this.extAuthor + '/' + this.extShortName;
      Install.initInstall(dispName, regName, this.extVersion);

      // Find directory to install into
      var installPath;
      if (this.profileInstall) {
         installPath = chromeDir;
      }
      else {
         installPath = globalDir;
      }

      // Add JAR file
      Install.addFile(regName, this.extVersion, "chrome/" + jarName, installPath, null);
      Install.addFile(regName, this.extVersion, defaultRepository, getFolder("Profile", "extensions/" + this.extGuid), null);
      Install.addFile(regName, this.extVersion, "inforss_rdf.default", getFolder("Profile", "extensions/" + this.extGuid), null);

      // Register chrome
      var jarPath = Install.getFolder(installPath, jarName);
      var installType = (this.profileInstall ? Install.PROFILE_CHROME : Install.DELAYED_CHROME);

      // Register content
      Install.registerChrome(Install.CONTENT | installType, jarPath,
                            'content/' + this.extShortName + '/');

      // Register locales
      for (var locale in this.extLocaleNames) {
         var regPath = 'locale/' + this.extLocaleNames[locale] + '/' + this.extShortName + '/';
         Install.registerChrome(Install.LOCALE | installType, jarPath, regPath);
      }

      // Register skins
      for (var skin in this.extSkinNames) {
         var regPath = 'skin/' + this.extSkinNames[skin] + '/';
         Install.registerChrome(Install.SKIN | installType, jarPath, regPath);
      }

      // Copy preference files
      for (var pref in this.extPreferences) {

         var prefFolder = getFolder('Program', 'defaults/pref/');
         addFile(this.extAuthor, 'defaults/preferences/' +
                 this.extPreferences[pref], prefFolder, null);
      }

      // Perform install
      var err = Install.performInstall();
      if (err == Install.SUCCESS || err == Install.REBOOT_NEEDED) {
         if (!this.silentInstall && this.extPostInstallMessage) {
            Install.alert('The ' + this.extFullName + ' ' + this.extVersion     +
                          ' extension has been ' + 'succesfully installed.\n\n' +
                           jarPath + '\n\n' + this.extPostInstallMessage);
         }
      }
      else   {
         this.handleError(err);
         return;
      }
   },

   parseArguments: function()   {
      // Can't use string handling in install, so use if statement instead
      var args = Install.arguments;
      if (args == 'p=0') {
         this.profileInstall = false;
         this.silentInstall = true;
      }
      else if (args == 'p=1')   {
         this.profileInstall = true;
         this.silentInstall = true;
      }
   },

   handleError: function(err)   {
      if (!this.silentInstall) {
         Install.alert('Error: Could not install ' + this.extFullName + ' ' + this.extVersion +
                       ' (Error code: ' + err + ')');
      }
      Install.cancelInstall(err);
   }
};

XpiInstaller.install();
