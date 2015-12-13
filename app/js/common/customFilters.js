var filters = angular.module('customFilters', []);

filters.filter('parseUrlFilter', function ($sce) {
    var urlPattern = /(http|ftp|https):\/\/[\w-]+(\.[\w-]+)+([\w.,@?^=%&amp;:\/~+#-]*[\w@?^=%&amp;\/~+#-])?/gi;
    return function (text, target) {
        return $sce.trustAsHtml(text.replace(urlPattern, '<a target="' + target + '" href="$&">$&</a>'));
    };
});