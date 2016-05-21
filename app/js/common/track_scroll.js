angular.module('trackScroll', [])
  .directive('trackScroll', function() {
    var body = document.body;

    function updateScroll(element, attr) {
      if (body.scrollTop >= attr.trackScroll) {
        element.addClass('fixed');
      } else {
        element.removeClass('fixed');
      }
    }

    return {
      restrict: 'A', // only activate on element attribute
      link: function(scope, element, attr) {
        angular.element(document).on('scroll', function() {
          updateScroll(element, attr);
        });
      }
    };
  });