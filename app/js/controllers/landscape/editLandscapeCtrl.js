// Copyright 2014 OpenWhere, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

angular.module('landscapesApp')
    .controller('EditLandscapeCtrl',
    function ($rootScope, $scope, $location, $modal, $upload, $filter, $routeParams, ValidationService, LandscapeService) {

        $scope.showUploadNewImage = false;
        $scope.showUploadNewTemplate = false;
        $scope.newImg = null;

        LandscapeService.retrieve($routeParams.id)
            .then(function(landscape) {
                $scope.landscape = landscape;
                $scope.template = JSON.parse($scope.landscape.cloudFormationTemplate);
                $scope.imgSrc = '/api/landscapes/' + landscape._id + '/image';
            })
            .catch(function(err) {
                err = err.data;
                console.log(err)
            });


        $scope.$watchCollection('newImg', function( ) {
            if($scope.newImg)
                $scope.imgSrc = $scope.newImg;
        });

        $scope.confirmDelete = function (msg, callback) {
            var modalInstance = $modal.open( {
                templateUrl: 'confirmDeleteModal.html',
                controller: DeleteModalInstanceCtrl,
                size: 'sm',
                resolve: { msg: function () { return msg; } }
            });

            modalInstance.result
                .then(function(deleteIsConfirmed) {
                    return callback(deleteIsConfirmed);
                });
        };

        $scope.toggleUploadNewImage = function() {
            $scope.showUploadNewImage = !$scope.showUploadNewImage;
            $scope.imageError = false;
        };

        $scope.incrementVersion = function() {
            $scope.landscape.version = (Number($scope.landscape.version) + 0.1).toFixed(1);
            $scope.form.$dirty = true;
        };

        $scope.deleteLandscape = function(name) {
            $scope.confirmDelete(name, function(deleteConfirmed) {
                if(deleteConfirmed === true) {
                    LandscapeService.delete($routeParams.id)
                        .then(function (data) {
                            $scope.go('/');
                        })
                        .catch(function (err) {
                            err = err.data;
                            console.log(err);
                        });
                }
            });
        };

        $scope.updateLandscape = function(form) {
            $scope.submitted = true;

            // validate cloudFormationTemplate here?

            if ($scope.landscape.cloudFormationTemplate === undefined || $scope.templateSelected === false) {
                form.$valid = false;
            }

            if(form.$valid) {
                LandscapeService.update($routeParams.id, {
                    name: $scope.landscape.name,
                    version: $scope.landscape.version,
                    imageUri: $scope.landscape.imageUri,
                    cloudFormationTemplate: $scope.landscape.cloudFormationTemplate,
                    infoLink: $scope.landscape.infoLink,
                    infoLinkText: $scope.landscape.infoLinkText,
                    description: $scope.landscape.description
                })
                    .then( function() {
                        $location.path('/landscapes/' + $routeParams.id)
                    })
                    .catch( function(err) {
                        err = err.data;
                        console.log(err);
                        $scope.errors = {};

                        // Update validity of form fields that match the mongoose errors
                        angular.forEach(err.errors, function(error, field) {
                            form[field].$setValidity('mongoose', false);
                            $scope.errors[field] = error.message;
                        });
                    });
            } else {
                console.log(JSON.stringify(form.$error));
            }
        };

        $scope.readFile = function() {
            console.log('readFile()');
        };

        $scope.onFileSelect = function($files) {
            console.log('onFileSelect()');
            for (var i = 0; i < $files.length; i++) {
                var file = $files[i];
                $scope.upload = $upload.upload({
                    url: '/api/upload/template',
                    method: 'POST',
                    withCredentials: true,
                    data: { myObj: $scope.myModelObj },
                    file: file
                })
                    .success(function(data) {
                        $scope.landscape.cloudFormationTemplate = $filter('json')(data);
                        $scope.templateSelected = true;
                    })
                    .error(function(err){
                        console.log(err);
                    });
            }
        };

        $scope.onImageSelect = function($files) {
            $scope.imageError = false;

            for (var i = 0; i < $files.length; i++) {
                var file = $files[i];
                $scope.upload = $upload.upload({
                    url: '/api/upload/image',
                    method: 'POST',
                    withCredentials: true,
                    data: { myObj: $scope.myModelObj },
                    file: file
                })
                    .success(function (data) {
                        data = JSON.parse($filter('json')(data));
                        $scope.landscape.imageUri = data.imageUri;
                        $scope.imageSelected = true;
                        $scope.showUploadNewImage = false;
                        $scope.form.$dirty = true;
                        $scope.newImg = data.imageUri;
                    })
                    .error(function(err, status, headers){
                        if(status == 400) {
                            $scope.imageError = err.msg || err;
                            console.log(err);
                        } else if(status == 500) {
                            $scope.imageError = '500 (Internal Server Error)';
                            console.log(err);
                        }
                    }
                );
            }
        }
    }
);

var DeleteModalInstanceCtrl = function ($scope, $modalInstance, msg) {
    $scope.msg = msg;

    $scope.confirmDeleteButtonClick = function (deleteConfirmed) {
        $modalInstance.close(deleteConfirmed);
    };
};