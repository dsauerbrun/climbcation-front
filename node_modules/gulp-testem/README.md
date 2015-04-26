gulp-testem
===========

Testem using gulp (WIP)

First, install `gulp-testen` as a development dependency:

```shell
npm install --save-dev gulp-testem
```

Then, add it to your `gulpfile.js`:


```javascript
gulp.task('coverage', function () {

    var coverageServer = http.createServer(function (req, resp) {
        req.pipe(fs.createWriteStream('coverage.json'))
        resp.end()
    });

    var port = 7358;
    coverageServer.listen(port);
    console.log("Coverage Server Started on port", port);
});

gulp.task('testem', ['coverage'], function () {
    gulp.src([''])
        .pipe(testem({
            configFile: 'testem.json'
        }));
});
```
