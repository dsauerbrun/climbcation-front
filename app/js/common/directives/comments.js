var facebookComments = angular.module('facebookComments', []);

facebookComments.directive('dynFbCommentBox', function () {
    function createHTML(href, numposts, progwidth) {
        return '<div class="fb-comments" ' +
                       'data-href="' + href + '" ' +
                       'data-numposts="' + numposts + '" ' +
                       'data-width="' + progwidth + '">' +
               '</div>';
    }

    return {
        restrict: 'A',
        scope: {},
        link: function postLink(scope, elem, attrs) {
            attrs.$observe('pageHref', function (newValue) {
                var href        = newValue;
                var numposts    = attrs.numposts    || 5;
                var progwidth = attrs.progwidth;

                elem.html(createHTML(href, numposts, progwidth));
                FB.XFBML.parse(elem[0]);
            });
        }
    };
});