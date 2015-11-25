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
