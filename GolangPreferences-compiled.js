/*
 * Copyright (c) 2013-2014 Minkyu Lee. All rights reserved.
 *
 * NOTICE:  All information contained herein is, and remains the
 * property of Minkyu Lee. The intellectual and technical concepts
 * contained herein are proprietary to Minkyu Lee and may be covered
 * by Republic of Korea and Foreign Patents, patents in process,
 * and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Minkyu Lee (niklaus.lee@gmail.com).
 *
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, regexp: true */
/*global define, $, _, window, appshell, staruml */

"use strict";

define(function (require, exports, module) {
    "use strict";

    var AppInit = app.getModule("utils/AppInit"),
        Core = app.getModule("core/Core"),
        PreferenceManager = app.getModule("core/PreferenceManager");

    var preferenceId = "golang";

    var golangPreferences = {
        "golang.gen": {
            text: "Golang Code Generation",
            type: "Section"
        },
        "golang.gen.goDoc": {
            text: "GoDoc",
            description: "Generate JavaDoc comments.",
            type: "Check",
            "default": true
        },
        "golang.gen.useTab": {
            text: "Use Tab",
            description: "Use Tab for indentation instead of spaces.",
            type: "Check",
            "default": false
        },
        "golang.gen.indentSpaces": {
            text: "Indent Spaces",
            description: "Number of spaces for indentation.",
            type: "Number",
            "default": 4
        },
        "golang.rev": {
            text: "Golang Reverse Engineering",
            type: "Section"
        },
        "golang.rev.association": {
            text: "Use Association",
            description: "Reverse Java Fields as UML Associations.",
            type: "Check",
            "default": true
        },
        "golang.rev.publicOnly": {
            text: "Public Only",
            description: "Reverse public members only.",
            type: "Check",
            "default": false
        },
        "golang.rev.typeHierarchy": {
            text: "Type Hierarchy Diagram",
            description: "Create a type hierarchy diagram for all classes and interfaces",
            type: "Check",
            "default": true
        },
        "golang.rev.packageOverview": {
            text: "Package Overview Diagram",
            description: "Create overview diagram for each package",
            type: "Check",
            "default": true
        },
        "golang.rev.packageStructure": {
            text: "Package Structure Diagram",
            description: "Create a package structure diagram for all packages",
            type: "Check",
            "default": true
        }
    };

    function getId() {
        return preferenceId;
    }

    function getGenOptions() {
        return {
            goDoc: PreferenceManager.get("golang.gen.goDoc"),
            useTab: PreferenceManager.get("golang.gen.useTab"),
            indentSpaces: PreferenceManager.get("golang.gen.indentSpaces")
        };
    }

    function getRevOptions() {
        return {
            association: PreferenceManager.get("golang.rev.association"),
            publicOnly: PreferenceManager.get("golang.rev.publicOnly"),
            typeHierarchy: PreferenceManager.get("golang.rev.typeHierarchy"),
            packageOverview: PreferenceManager.get("golang.rev.packageOverview"),
            packageStructure: PreferenceManager.get("golang.rev.packageStructure")
        };
    }

    AppInit.htmlReady(function () {
        PreferenceManager.register(preferenceId, "golang", golangPreferences);
    });

    exports.getId = getId;
    exports.getGenOptions = getGenOptions;
    exports.getRevOptions = getRevOptions;
});

//# sourceMappingURL=GolangPreferences-compiled.js.map