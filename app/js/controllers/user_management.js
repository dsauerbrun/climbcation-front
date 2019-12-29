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

userManagement.controller('ProfileController',['ngToast', '$scope', '$rootScope', 'helperService', '$http', '$routeParams', '$location', 'authService', function(ngToast,$scope,$rootScope,helperService,$http,$routeParams,$location, authService){
	$scope.username = null;
	$scope.submitSuccess = false;
	$scope.submitError = null;
	$scope.submitting = false;

	$scope.changeUsername = async function() {
		$scope.submitting = true;
		$scope.submitError = null;
		try {
			await authService.changeUsername($scope.username);
			$scope.submitSuccess = true;
			authService.user.username = $scope.username;
		} catch (err) {
			$scope.submitError = err;
		}
		
		$scope.submitting = false;
		$scope.$apply();
	}

	this.$onInit = async () => {
    let user = await authService.getUser();
    $scope.username = user.username;
    $scope.$apply();
  }

}]);