/*
 * Copyright (c) 2014 MKLab. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 *
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, regexp: true */
/*global define, $, _, window, app, type, appshell, document */

"use strict";

define(function (require, exports, module) {
    "use strict";

    var Commands = app.getModule("command/Commands"),
        CommandManager = app.getModule("command/CommandManager"),
        ElementPickerDialog = app.getModule("dialogs/ElementPickerDialog"),
        Dialogs = app.getModule("dialogs/Dialogs"),
        FileSystem = app.getModule("filesystem/FileSystem"),
        FileSystemError = app.getModule("filesystem/FileSystemError"),
        MenuManager = app.getModule("menu/MenuManager");

    var CodeGenUtils = require("CodeGenUtils"),
        GolangPreferences = require("GolangPreferences"),

    //JavaReverseEngineer = require("JavaReverseEngineer"),
    GolangCodeGenerator = require("GolangCodeGenerator");
    //GolangCodeGenerator   = require("GolangCodeGenerator");

    function handleHelloWorld() {
        window.alert("Hello, world!");
    }

    // Add a HelloWorld command

    var CMD_GOLANG = 'golang',
        CMD_GOLANG_GENERATE = 'golang.generate',
        CMD_GOLANG_REVERSE = 'golang.reverse',
        CMD_GOLANG_CONFIGURE = 'golang.configure';
    //var CMD_GOLANG = "tools.helloworld";
    CommandManager.register("Golang", CMD_GOLANG, CommandManager.doNothing);

    CommandManager.register("Generate Golang Code", CMD_GOLANG_GENERATE, _handleGenerate);

    // Add HelloWorld menu item (Tools > Hello World)
    var menu = MenuManager.getMenu(Commands.TOOLS);

    var golangMenu = menu.addMenuItem(CMD_GOLANG);

    golangMenu.addMenuItem(CMD_GOLANG_GENERATE);

    /*
     var AppInit             = app.getModule("utils/AppInit"),
     Repository          = app.getModule("core/Repository"),
     Engine              = app.getModule("engine/Engine"),
     Commands            = app.getModule("command/Commands"),
     CommandManager      = app.getModule("command/CommandManager"),
     MenuManager         = app.getModule("menu/MenuManager"),
       ExtensionUtils      = app.getModule("utils/ExtensionUtils"),
     UML                 = app.getModule("uml/UML");
       var CodeGenUtils        = require("CodeGenUtils"),
     JavaPreferences     = require("JavaPreferences"),
     JavaCodeGenerator   = require("JavaCodeGenerator"),
     JavaReverseEngineer = require("JavaReverseEngineer");
     */

    /**
     * Commands IDs
     */
    /*
        var CMD_JAVA           = 'golang',
            CMD_JAVA_GENERATE  = 'golang.generate',
            CMD_JAVA_REVERSE   = 'golang.reverse',
            CMD_JAVA_CONFIGURE = 'golang.configure';
    */
    /**
     * Command Handler for Java Generate
     *
     * @param {Element} base
     * @param {string} path
     * @param {Object} options
     * @return {$.Promise}
     */

    function _handleGenerate(base, path, options) {
        var result = new $.Deferred();

        options = options || GolangPreferences.getGenOptions();

        console.log(result);
        if (!base) {
            ElementPickerDialog.showDialog("Select a base model to generate codes", null, type.UMLPackage).done(function (buttinId, selected) {
                if (buttinId === Dialogs.DIALOG_BTN_OK && selected) {
                    base = selected;

                    if (!path) {
                        FileSystem.showOpenDialog(false, true, "Select a folder where generated codes to be located", null, null, function (err, files) {
                            if (!err) {
                                if (files.length > 0) {
                                    path = files[0];
                                    GolangCodeGenerator.generate(base, path, options).then(result.resolve, result.reject);
                                } else {
                                    result.reject(FileSystem.USER_CANCELED);
                                }
                            } else {
                                result.reject(err);
                            }
                        });
                    } else {
                        GolangCodeGenerator.generate(base, path, options).then(result.resolve, result.reject);
                    }
                } else {
                    result.reject();
                }
            });
        } else {
            if (!path) {
                FileSystem.showOpenDialog(false, true, "Select a folder where generated codes to be located", null, null, function (err, files) {
                    if (!err) {
                        if (files.length > 0) {
                            path = files[0];
                            GolangCodeGenerator.generate(base, path, options).then(result.resolve, result.reject);
                        } else {
                            result.reject(FileSystem.USER_CANCELED);
                        }
                    } else {
                        GolangCodeGenerator.generate(base, path, options).then(result.resolve, result.reject);
                    }
                });
            } else {
                GolangCodeGenerator.generate(base, path, options).then(result.resolve, result.reject);
            }
        }

        //debugger;

        return result.promise();
    }

    /**
     * Command Handler for Java Reverse
     *
     * @param {string} basePath
     * @param {Object} options
     * @return {$.Promise}
     */
    /*
       function _handleReverse(basePath, options) {
           var result = new $.Deferred();
            // If options is not passed, get from preference
           options = JavaPreferences.getRevOptions();
            // If basePath is not assigned, popup Open Dialog to select a folder
           if (!basePath) {
               FileSystem.showOpenDialog(false, true, "Select Folder", null, null, function (err, files) {
                   if (!err) {
                       if (files.length > 0) {
                           basePath = files[0];
                           JavaReverseEngineer.analyze(basePath, options).then(result.resolve, result.reject);
                       } else {
                           result.reject(FileSystem.USER_CANCELED);
                       }
                   } else {
                       result.reject(err);
                   }
               });
           }
           return result.promise();
       }
    */

    /**
     * Popup PreferenceDialog with Java Preference Schema
     */
    /*
       function _handleConfigure() {
           CommandManager.execute(Commands.FILE_PREFERENCES, JavaPreferences.getId());
       }
        // Register Commands
       CommandManager.register("Java",             CMD_JAVA,           CommandManager.doNothing);
       CommandManager.register("Generate Code...", CMD_JAVA_GENERATE,  _handleGenerate);
       CommandManager.register("Reverse Code...",  CMD_JAVA_REVERSE,   _handleReverse);
       CommandManager.register("Configure...",     CMD_JAVA_CONFIGURE, _handleConfigure);
        var menu, menuItem;
       menu = MenuManager.getMenu(Commands.TOOLS);
       menuItem = menu.addMenuItem(CMD_JAVA);
       menuItem.addMenuItem(CMD_JAVA_GENERATE);
       menuItem.addMenuItem(CMD_JAVA_REVERSE);
       menuItem.addMenuDivider();
       menuItem.addMenuItem(CMD_JAVA_CONFIGURE);
    */
});

//# sourceMappingURL=main-compiled.js.map