var gulp        = require('gulp');
var gutil       = require('gulp-util');
var bower       = require('bower');
var concat      = require('gulp-concat');
var sass        = require('gulp-sass');
var minifyCss   = require('gulp-minify-css');
var gulpif      = require('gulp-if');
var rename      = require('gulp-rename');
var args        = require('yargs').argv;
var fs          = require('fs');
var sh          = require('shelljs');
var groupConcat = require('gulp-group-concat');
var ngAnnotate  = require('gulp-ng-annotate');
var uglify      = require('gulp-uglify');
var debug       = require('gulp-debug');
var runSequence = require('run-sequence');
var replace     = require('gulp-replace-task');
var file        = require('gulp-file');

var paths = {
  sass: ['./scss/**/*.scss']
};

gulp.task(
  'default',
  function(){
    runSequence(
      'semantic-move-css',
      'sass',
      'semantic-move-assets',
      'replace',
      'process-js',
      function(){console.log('ok');}
    );
  }
);

gulp.task(
  'prepare-build',
  function(){
    runSequence(
      'semantic-move-css',
      'sass',
      'semantic-move-assets',
      'replace',
      'process-js',
      function(){console.log('ok');}
    );
  }
);

gulp.task(
  'bootstrap',
  function(){
    runSequence(
      'add-file-constants',
      'add-file-dev-config',
      'add-file-prod-config',
      'add-file-localization-en',
      'add-file-localization-es',
      'add-file-app',
      'add-file-index'
    );
  }
);

gulp.task('watch', function() {
  gulp.watch(
    paths.sass,
    [
      'semantic-move-css',
      'sass',
      'semantic-move-assets',
    ]
  );
});

gulp.task('install', ['git-check'], function() {
  return bower.commands.install()
    .on('log', function(data) {
      gutil.log('bower', gutil.colors.cyan(data.id), data.message);
    });
});

gulp.task('git-check', function(done) {
  if (!sh.which('git')) {
    console.log(
      '  ' + gutil.colors.red('Git is not installed.'),
      '\n  Git, the version control system, is required to download Ionic.',
      '\n  Download git here:', gutil.colors.cyan('http://git-scm.com/downloads') + '.',
      '\n  Once git is installed, run \'' + gutil.colors.cyan('gulp install') + '\' again.'
    );
    process.exit(1);
  }
  done();
});

/*
  Compile resources, minify and concatenate files.
 */

gulp.task('sass', function(done) {
  gulp.src('./scss/ionic.app.scss')
    .pipe(debug({title: 'Compiling sass and merging semantic css:'}))
    .pipe(sass())
    .on('error', sass.logError)
    .pipe(gulp.dest('./www/dist/css/'))
    .pipe(minifyCss({
      keepSpecialComments: 0
    }))
    .pipe(rename({ extname: '.min.css' }))
    .pipe(gulp.dest('./www/dist/css/'))
    .on('end', done);
});

gulp.task('process-js', function () {
  var mode = args.mode || 'debug';

  /** Concat and uglify **/
  gulp.src([
    'www/js/**/*.js',
    'www/lib/jquery/dist/jquery.js',
    'www/lib/ionic/js/ionic.bundle.js',
    'www/lib/semantic/dist/semantic.js',
    'www/lib/ngCordova/dist/ng-cordova.js',
    'www/lib/angular-translate/angular-translate.js',
    'www/lib/angular-translate-loader-static-files/*.js',
    'www/lib/angular-translate-storage-cookie/*.js',
    'www/lib/angular-translate-storage-local/*.js',
    'www/lib/angular-cookies/*.js'
  ])
    .pipe(debug({title: 'Concatenating and uglifying js files:'}))
    .pipe(groupConcat({
      'build.min.js': [
        'www/js/constants/*.js',
        'www/js/app.js',
        'www/js/**/*.js'
      ],
      'ionic.min.js':[
        'www/lib/ionic/js/ionic.bundle.js'
      ],
      'vendor.min.js': [
      //  'www/js/facebook.js',
      //  'www/js/quick-ng-repeat.js',
      //  'www/lib/lawnchair/src/Lawnchair.js',
      //  'www/lib/lawnchair/src/adapters/dom.js',
      //  'www/lib/lawnchair/src/adapters/indexed-db.js',
      //  'www/lib/d3/d3-mod.js',
      //  'www/lib/d3/topojson.v1.min.js',
        'www/lib/jquery/dist/jquery.js',
        'www/lib/semantic/dist/semantic.js',
        'www/lib/ngCordova/dist/ng-cordova.js'
      ],
      'angular-mods.min.js':[
      //  'www/lib/angular-http-auth/src/http-auth-interceptor.js',
      //  'www/lib/oclazyload/dist/ocLazyLoad.js',
      //  'www/common/translation/translation.js',
        'www/lib/angular-translate/angular-translate.js',
        'www/lib/angular-translate-loader-static-files/angular-translate-loader-static-files.js',
        'www/lib/angular-cookies/angular-cookies.js',
        'www/lib/angular-translate-storage-local/angular-translate-storage-local.js',
      //  'www/lib/angular-translate-loader-partial/angular-translate-loader-partial.js'
        'www/lib/angular-translate-storage-cookie/angular-translate-storage-cookie.js'
      ]
    }))
    .pipe(ngAnnotate())
    .pipe(gulpif(mode==='prod', uglify()))
    .pipe(gulp.dest('www/dist/js'));
});

/*
  Tasks to copy and setup Semantic UI css and assets
*/

gulp.task('semantic-move-css', function(){
  gulp.src('./www/lib/semantic/dist/semantic.css')
    .pipe(debug({title: 'moving css from Semantic UI:'}))
    .pipe(rename('_semantic.scss'))
    .pipe(gulp.dest('./scss/vendor/'));
});

gulp.task('semantic-move-assets', function(){
  gulp.src('./www/lib/semantic/dist/themes/**/*', {base: './www/lib/semantic/dist/'})
    .pipe(debug({title: 'moving assets from Semantic UI:'}))
    .pipe(gulp.dest('./www/dist/css/'));
});

/*
  Environment variables setup
*/

gulp.task('replace', function () {
  // Get the environment from the command line
  var env = args.env || 'dev';

  // Read the settings from the right file
  var filename = env + '.json';
  var settings = JSON.parse(fs.readFileSync('./www/config/' + filename, 'utf8'));

  var patternArray = [];

  for (key in settings) {
    var p = {
      match: key,
      replacement: settings[key]
    };
    patternArray.push(p);
  };

  console.log(patternArray);

  // Replace each placeholder with the correct value for the variable.
  gulp.src('www/js/constants/constants_template.js')
    .pipe(debug({title: 'replacing environmental variables:'}))
    .pipe(replace({
      patterns: patternArray
    }))
    .pipe(rename('constants.js'))
    .pipe(gulp.dest('www/js/constants/'));
});


/**
  Bootstrap project with files
 */
gulp.task('add-file-constants', function() {
  // Get the environment from the command line
  var title = args.title || 'starter';
  var comments = '//Automatically generated file. Edit to add new constants to the project.\n';
  var str = 'angular.module("'+title+'.constants", [])\n.constant("API_URL", "@@API_URL");';
   return file('constants_template.js', comments+str, { src: true }).pipe(gulp.dest('www/js/constants/'));
});

gulp.task('add-file-dev-config', function() {
  var comments = '//Automatically generated file. Edit to add new development environment variables to the project.\n';
  var str = '{"API_URL": "https://www.test.com"}';
   return file('dev.json', comments+str, { src: true }).pipe(gulp.dest('www/config/'));
});

gulp.task('add-file-prod-config', function() {
  var comments = '//Automatically generated file. Edit to add new production environment variables to the project.\n';
  var str = '{"API_URL": "https://www.test.com"}';
   return file('prod.json', comments+str, { src: true }).pipe(gulp.dest('www/config/'));
});

gulp.task('add-file-localization-en', function() {
  // Get the environment from the command line
  var title = args.title || 'starter';
  var comments = '//Automatically generated file. Edit to add new localization in english to the project.\n';
  var str = '{"title": "'+title+'"}';
  return file('en.json', comments+str, { src: true }).pipe(gulp.dest('www/languages/'));
});

gulp.task('add-file-localization-es', function() {
  // Get the environment from the command line
  var title = args.title || 'starter';
  var comments = '//Automatically generated file. Edit to add new localization in spanish to the project.\n';
  var str = '{"title": "'+title+'"}';
  return file('es.json', comments+str, { src: true }).pipe(gulp.dest('www/languages/'));
});

gulp.task('add-file-app', function() {
  // Get the environment from the command line
  var title = args.title || 'starter';
  var comments = '//Automatically generated file. Edit to add new localization in spanish to the project.\n';
  var str = 'angular.module("'+title+'", ["ionic", "'+title+'.constants", "pascalprecht.translate", "ngCookies"])\n'+
    '.config(function($translateProvider){\n'+
    '  // Translations configuration\n'+
    '  $translateProvider.useStaticFilesLoader({\n'+
    '    prefix: "/languages/",\n'+
    '    suffix: ".json"\n'+
    '  });\n'+
    '  $translateProvider.useLocalStorage();\n'+
    '   $translateProvider.preferredLanguage("en");\n'+
    '})\n'+
    '.run(function($ionicPlatform) {\n'+
    '  $ionicPlatform.ready(function() {\n'+
    '    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard\n'+
    '    // for form inputs)\n'+
    '    if(window.cordova && window.cordova.plugins.Keyboard) {\n'+
    '      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);\n'+
    '    }\n'+
    '    if(window.StatusBar) {\n'+
    '      StatusBar.styleDefault();\n'+
    '    }\n'+
    '  });\n'+
    '})';
  return file('app.js', comments+str, { src: true }).pipe(gulp.dest('www/js/'));
});

gulp.task('add-file-index', function() {
  // Get the environment from the command line
  var title = args.title || 'starter';
  var comments = '//Automatically generated file. Edit to add new localization in spanish to the project.\n';
  var str = '<!DOCTYPE html>\n'+
      '<html>\n'+
      '  <head>\n'+
      '    <meta charset="utf-8">\n'+
      '    <meta name="viewport" content="initial-scale=1, maximum-scale=1, user-scalable=no, width=device-width">\n'+
      '    <title>'+title+'</title>\n'+
      '    <!-- compiled css output -->\n'+
      '    <link href="dist/css/ionic.app.css" rel="stylesheet">\n'+
      '  </head>\n'+
      '  <body ng-app="'+title+'">\n'+
      '    <ion-pane>\n'+
      '      <ion-header-bar class="bar-stable">\n'+
      '        <h1 class="title">{{ "title" | translate}}</h1>\n'+
      '      </ion-header-bar>\n'+
      '      <ion-content>\n'+
      '      </ion-content>\n'+
      '    </ion-pane>\n'+

      '    <!-- ionic/angularjs js -->\n'+
      '    <script src="dist/js/ionic.min.js"></script>\n'+
      '    <script src="dist/js/angular-mods.min.js"></script>\n'+
      '    <script src="dist/js/vendor.min.js"></script>\n'+
      '    <!-- cordova script (this will be a 404 during development) -->\n'+
      '    <script src="cordova.js"></script>\n'+

      '    <!-- your apps js -->\n'+
      '    <script src="dist/js/build.min.js"></script>\n'+
      '  </body>\n'+
      '</html>';
  return file('index.html', comments+str, { src: true }).pipe(gulp.dest('www/'));
});


