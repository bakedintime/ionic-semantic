// Ionic Starter App
angular.module('starter', ['ionic', 'constants', 'pascalprecht.translate', 'ngCookies'])
.config(function($translateProvider){
  // Translations configuration
  $translateProvider.useStaticFilesLoader({
    prefix: '/languages/',
    suffix: '.json'
  });
  $translateProvider.useLocalStorage();
   $translateProvider.preferredLanguage('en');
})
.run(function($ionicPlatform) {
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if(window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }
    if(window.StatusBar) {
      StatusBar.styleDefault();
    }
  });
})
