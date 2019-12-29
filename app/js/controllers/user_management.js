var userManagement = angular.module('UserManagement', []);



userManagement.controller('ResetPasswordController',['ngToast', '$scope', '$rootScope', 'helperService', '$http', '$routeParams', '$location', 'authService', function(ngToast,$scope,$rootScope,helperService,$http,$routeParams,$location, authService){
	$scope.password = null;
	$scope.passwordSuccess = false;
	$scope.submitError = null;
	$scope.changingPassword = false;

	$scope.changePassword = async function() {
		$scope.changingPassword = true;
		let id = $routeParams.id;
		try {
			await authService.changePassword($scope.password, id);
			$scope.passwordSuccess = true;
		} catch (err) {
			$scope.submitError = err;
		}
		
		$scope.changingPassword = false;
		$scope.$apply();
	}

}]);