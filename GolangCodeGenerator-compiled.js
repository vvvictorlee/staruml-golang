/**
 * Created by gimtaehyeon on 2015. 10. 17..
 */

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
/*global define, $, _, window, app, type, document, java7 */

"use strict";

define(function (require, exports, module) {
    "use strict";

    var Repository = app.getModule("core/Repository"),
        ProjectManager = app.getModule("engine/ProjectManager"),
        Engine = app.getModule("engine/Engine"),
        FileSystem = app.getModule("filesystem/FileSystem"),
        FileUtils = app.getModule("file/FileUtils"),
        Async = app.getModule("utils/Async"),
        UML = app.getModule("uml/UML");

    var CodeGenUtils = require("CodeGenUtils");

    /**
     * Java Code Generator
     * @constructor
     *
     * @param {type.UMLPackage} baseModel
     * @param {string} basePath generated files and directories to be placed
     */
    function GolangCodeGenerator(baseModel, basePath) {

        /** @member {type.Model} */
        this.baseModel = baseModel;

        /** @member {string} */
        this.basePath = basePath;
    }

    /**
     * Return Indent String based on options
     * @param {Object} options
     * @return {string}
     */
    GolangCodeGenerator.prototype.getIndentString = function (options) {
        if (options.useTab) {
            return "\t";
        } else {
            var i,
                len,
                indent = [];
            for (i = 0, len = options.indentSpaces; i < len; i++) {
                indent.push(" ");
            }
            return indent.join("");
        }
    };

    /**
     * Generate codes from a given element
     * @param {type.Model} elem
     * @param {string} path
     * @param {Object} options
     * @return {$.Promise}
     */
    GolangCodeGenerator.prototype.generate = function (elem, path, options) {
        var result = new $.Deferred(),
            self = this,
            fullPath,
            directory,
            codeWriter,
            file;

        // Package
        if (elem instanceof type.UMLPackage) {
            fullPath = path + "/" + elem.name;

            directory = FileSystem.getDirectoryForPath(fullPath);
            directory.create(function (err, stat) {
                if (!err) {
                    Async.doSequentially(elem.ownedElements, function (child) {
                        return self.generate(child, fullPath, options);
                    }, false).then(result.resolve, result.reject);
                } else {
                    result.reject(err);
                }
            });
        } else {
            //common
            fullPath = path + "/" + elem.name + ".go";
            codeWriter = new CodeGenUtils.CodeWriter(this.getIndentString(options));
            this.writePackageDeclaration(codeWriter, elem, options);
            codeWriter.writeLine();
            codeWriter.writeLine("import ()");
            codeWriter.writeLine();

            if (elem instanceof type.UMLClass) {
                this.writeClass(codeWriter, elem, options);
            } else if (elem instanceof type.UMLInterface) {
                this.writeInterface(codeWriter, elem, options);
            } else if (elem instanceof type.UMLEnumeration) {
                this.writeEnum(codeWriter, elem, options);
            } else {
                result.resolve();
                return result.promise();
            }

            file = FileSystem.getFileForPath(fullPath);
            FileUtils.writeText(file, codeWriter.getData(), true).then(result.resolve, result.reject);
        }
        return result.promise();
    };

    /**
     * Return visibility
     * @param {type.Model} elem
     * @return {string}
     */
    GolangCodeGenerator.prototype.getVisibility = function (elem) {
        var str = elem.name;

        switch (elem.visibility) {
            case UML.VK_PUBLIC:

                return str.substring(0, 1).toUpperCase() + str.substring(1, str.length); //  "public";
            case UML.VK_PROTECTED:
            case UML.VK_PRIVATE:
                return str.substring(0, 1).toLowerCase() + str.substring(1, str.length);
        }
        return null;
    };

    /**
     * Collect modifiers of a given element.
     * @param {type.Model} elem
     * @return {Array.<string>}
     */
    GolangCodeGenerator.prototype.getModifiers = function (elem) {

        var modifiers = [];

        var visibility = this.getVisibility(elem);
        if (visibility) {
            modifiers.push(visibility);
        }

        /*
        if (elem.isStatic === true) {
            modifiers.push("static");
        }
        if (elem.isAbstract === true) {
            modifiers.push("abstract");
        }
        if (elem.isFinalSpecialization === true || elem.isLeaf === true) {
            modifiers.push("final");
        }
        if (elem.concurrency === UML.CCK_CONCURRENT) {
            modifiers.push("synchronized");
        }
        */

        // transient
        // volatile
        // strictfp
        // const
        // native
        return modifiers;
    };

    /**
     * Collect super classes of a given element
     * @param {type.Model} elem
     * @return {Array.<type.Model>}
     */
    GolangCodeGenerator.prototype.getSuperClasses = function (elem) {
        var generalizations = Repository.getRelationshipsOf(elem, function (rel) {
            return rel instanceof type.UMLGeneralization && rel.source === elem;
        });
        return _.map(generalizations, function (gen) {
            return gen.target;
        });
    };

    /**
     * Collect super interfaces of a given element
     * @param {type.Model} elem
     * @return {Array.<type.Model>}
     */
    GolangCodeGenerator.prototype.getSuperInterfaces = function (elem) {
        var realizations = Repository.getRelationshipsOf(elem, function (rel) {
            return rel instanceof type.UMLInterfaceRealization && rel.source === elem;
        });
        return _.map(realizations, function (gen) {
            return gen.target;
        });
    };

    /**
     * Return type expression
     * @param {type.Model} elem
     * @return {string}
     */
    GolangCodeGenerator.prototype.getType = function (elem) {
        var _type = "void";
        // type name
        if (elem instanceof type.UMLAssociationEnd) {
            if (elem.reference instanceof type.UMLModelElement && elem.reference.name.length > 0) {
                _type = elem.reference.name;
            }
        } else {
            if (elem.type instanceof type.UMLModelElement && elem.type.name.length > 0) {
                _type = elem.type.name;
            } else if (_.isString(elem.type) && elem.type.length > 0) {
                _type = elem.type;
            }
        }
        // multiplicity
        if (elem.multiplicity) {
            if (_.contains(["0..*", "1..*", "*"], elem.multiplicity.trim())) {
                if (elem.isOrdered === true) {
                    _type = "List<" + _type + ">";
                } else {
                    _type = "Set<" + _type + ">";
                }
            } else if (elem.multiplicity !== "1" && elem.multiplicity.match(/^\d+$/)) {
                // number
                _type += "[]";
            }
        }
        return _type;
    };

    /**
     * Write Doc
     * @param {StringWriter} codeWriter
     * @param {string} text
     * @param {Object} options
     */
    GolangCodeGenerator.prototype.writeDoc = function (codeWriter, text, options) {
        var i, len, lines;
        if (options.javaDoc && _.isString(text)) {
            lines = text.trim().split("\n");
            codeWriter.writeLine("/**");
            for (i = 0, len = lines.length; i < len; i++) {
                codeWriter.writeLine(" * " + lines[i]);
            }
            codeWriter.writeLine(" */");
        }
    };

    /**
     * Write Package Declaration
     * @param {StringWriter} codeWriter
     * @param {type.Model} elem
     * @param {Object} options
     */
    GolangCodeGenerator.prototype.writePackageDeclaration = function (codeWriter, elem, options) {
        /*
        if (elem._parent) {
            path = _.map(elem._parent.getPath(this.baseModel), function (e) { return e.name; }).join(".");
        }
        if (path) {
            codeWriter.writeLine("package " + path );
        }
        */
        console.log("package path ::::" + elem._parent.name);

        return codeWriter.writeLine("package " + elem._parent.name);
    };

    /**
     * Write Constructor
     * @param {StringWriter} codeWriter
     * @param {type.Model} elem
     * @param {Object} options
     */
    GolangCodeGenerator.prototype.writeConstructor = function (codeWriter, elem, options) {
        if (elem.name.length > 0) {
            var terms = [];
            var str = elem.name; // 이름
            var sturctName = this.getVisibility(elem);
            // Doc
            this.writeDoc(codeWriter, "Default constructor", options);
            // Visibility
            terms.push("func ");

            //var visibility = this.getVisibility(elem);

            if (!elem.visibility || elem.visibility == UML.VK_PUBLIC) {
                terms.push("New");
                terms.push(str.substring(0, 1).toUpperCase() + str.substring(1, str.length)); //  "public";
            } else {
                    terms.push("new");
                    terms.push(str.substring(0, 1).toLowerCase() + str.substring(1, str.length));
                }

            terms.push(" *" + sturctName + " ");
            codeWriter.writeLine(terms.join(" ") + " {");
            codeWriter.indent();
            codeWriter.writeLine("return &" + sturctName + "{}");

            codeWriter.writeLine("}");
            codeWriter.outdent();
        }
        console.debug(codeWriter);
    };

    /**
     * Write Member Variable
     * @param {StringWriter} codeWriter
     * @param {type.Model} elem
     * @param {Object} options
     */
    GolangCodeGenerator.prototype.writeMemberVariable = function (codeWriter, elem, options) {
        if (elem.name.length > 0) {
            var terms = [];
            // doc
            this.writeDoc(codeWriter, elem.documentation, options);
            // modifiers

            var _modifiers = this.getModifiers(elem);
            if (_modifiers.length > 0) {
                terms.push(_modifiers.join(" "));
            }

            //terms.push(elem.name);

            // type
            terms.push(this.getType(elem));
            /*
            // initial value
            if (elem.defaultValue && elem.defaultValue.length > 0) {
                terms.push("= " + elem.defaultValue);
            }
            */
            codeWriter.writeLine(terms.join(" ") + "");
        }
    };

    /**
     * Write Method
     * @param {StringWriter} codeWriter
     * @param {type.Model} elem
     * @param {Object} options
     * @param {boolean} skipBody
     * @param {boolean} skipParams
     */
    GolangCodeGenerator.prototype.writeMethod = function (codeWriter, elem, options, skipBody, skipParams) {

        if (elem.name.length > 0) {
            var terms = [];
            var params = elem.getNonReturnParameters();
            var returnParam = elem.getReturnParameter();
            console.debug("params :::::" + params);
            console.debug("returnParam :::::" + returnParam);
            debugger;
            var structName = this.getVisibility(elem._parent);

            // doc
            var doc = elem.documentation.trim();

            //Erase Javadoc @param and @return
            var i,
                lines = doc.split("\n");
            doc = "";
            for (i = 0, len = lines.length; i < len; i++) {
                if (lines[i].lastIndexOf("@param", 0) !== 0 && lines[i].lastIndexOf("@return", 0) !== 0) {
                    doc += "\n" + lines[i];
                }
            }

            _.each(params, function (param) {
                doc += "\n@param " + param.name + " " + param.documentation;
            });
            if (returnParam) {
                doc += "\n@return " + returnParam.documentation;
            }
            this.writeDoc(codeWriter, doc, options);

            terms.push("func ");

            if (elem.isStatic === true) {} else {
                terms.push("( ");
                terms.push(strcutName);
                terms.push(" this");
                terms.push(") ");
            }
            // modifiers (name)
            var _modifiers = this.getModifiers(elem);

            if (_modifiers.length > 0) {
                terms.push(_modifiers.join(" "));
            }

            // type

            if (returnParam) {
                terms.push(this.getType(returnParam));
            } else {
                terms.push("");
            }

            // name + parameters
            var paramTerms = [];
            if (!skipParams) {
                var i, len;
                for (i = 0, len = params.length; i < len; i++) {
                    var p = params[i];
                    var s = this.getType(p) + " " + p.name;
                    if (p.isReadOnly === true) {
                        s = "final " + s;
                    }
                    paramTerms.push(s);
                }
            }
            terms.push(elem.name + "(" + paramTerms.join(", ") + ")");

            // body
            if (skipBody === true || _.contains(_modifiers, "abstract")) {
                codeWriter.writeLine(terms.join(" ") + ";");
            } else {
                codeWriter.writeLine(terms.join(" ") + " {");
                codeWriter.indent();
                codeWriter.writeLine("// TODO implement here");

                // return statement
                if (returnParam) {
                    var returnType = this.getType(returnParam);
                    if (returnType === "boolean") {
                        codeWriter.writeLine("return false;");
                    } else if (returnType === "int" || returnType === "long" || returnType === "short" || returnType === "byte") {
                        codeWriter.writeLine("return 0;");
                    } else if (returnType === "float") {
                        codeWriter.writeLine("return 0.0f;");
                    } else if (returnType === "double") {
                        codeWriter.writeLine("return 0.0d;");
                    } else if (returnType === "char") {
                        codeWriter.writeLine("return '0';");
                    } else if (returnType === "String") {
                        codeWriter.writeLine('return "";');
                    } else {
                        codeWriter.writeLine("return null;");
                    }
                }

                codeWriter.outdent();
                codeWriter.writeLine("}");
            }
        }
    };

    /**
     * Write Class
     * @param {StringWriter} codeWriter
     * @param {type.Model} elem
     * @param {Object} options
     */

    GolangCodeGenerator.prototype.writeClass = function (codeWriter, elem, options) {
        var i,
            len,
            terms = [];

        // Doc

        var doc = elem.documentation.trim();

        if (ProjectManager.getProject().author && ProjectManager.getProject().author.length > 0) {
            doc += "\n@author " + ProjectManager.getProject().author;
        }

        this.writeDoc(codeWriter, doc, options);

        // Modifiers

        terms.push("type\n");
        codeWriter.writeLine(terms.join(" "), "(");

        //terms.writeLine();
        codeWriter.indent();

        var _modifiers = this.getModifiers(elem);
        codeWriter.writeLine(_modifiers + " struct {");

        /*
        if ( _.contains(_modifiers, "abstract") !== true && _.some(elem.operations, function (op) { return op.isAbstract === true; })) {
            _modifiers.push("abstract");
        }
         if (_modifiers.length > 0) {
            terms.push(_modifiers.join(" "));
        }
        */

        // Extends

        var _extends = this.getSuperClasses(elem);
        if (_extends.length > 0) {
            codeWriter.indent();
            codeWriter.writerLine(_extends[0].name + "/* extend  */");
        }
        codeWriter.outdentine();
        var _implements = this.getSuperInterfaces(elem);
        if (_implements.length > 0) {
            //terms.push
            console.debug("implements " + _.map(_implements, function (e) {
                return e.name;
            }) + ", ");
        }
        /*
        // Implements
          // (from associations)
          var associations = Repository.getRelationshipsOf(elem, function (rel) {
         return (rel instanceof type.UMLAssociation);
         });
          for (i = 0, len = associations.length; i < len; i++) {
         var asso = associations[i];
         if (asso.end1.reference === elem && asso.end2.navigable === true) {
         this.writeMemberVariable(codeWriter, asso.end2, options);
         codeWriter.writeLine();
         }
         if (asso.end2.reference === elem && asso.end1.navigable === true) {
         this.writeMemberVariable(codeWriter, asso.end1, options);
         codeWriter.writeLine();
         }
         }
         */
        codeWriter.indent();

        // Member Variables
        // (from attributes)

        for (i = 0, len = elem.attributes.length; i < len; i++) {
            this.writeMemberVariable(codeWriter, elem.attributes[i], options);
        }

        codeWriter.writeLine("}");
        codeWriter.outdent();

        codeWriter.writeLine(")");
        codeWriter.outdent();

        // Constructor
        codeWriter.writeLine("//Constructor");

        this.writeConstructor(codeWriter, elem, options);
        codeWriter.writeLine();
        //@todo 여기 멈춤

        codeWriter.writeLine();

        // Methods
        for (i = 0, len = elem.operations.length; i < len; i++) {
            this.writeMethod(codeWriter, elem.operations[i], options, false, false);
            codeWriter.writeLine();
        }
        debugger;
        // Extends methods

        /*
        if (_extends.length > 0) {
            for (i = 0, len = _extends[0].operations.length; i < len; i++) {
                _modifiers = this.getModifiers(_extends[0].operations[i]);
                if( _.contains(_modifiers, "abstract") === true ) {
                    this.writeMethod(codeWriter, _extends[0].operations[i], options, false, false);
                    codeWriter.writeLine();
                }
            }
        }
        */

        // Interface methods
        for (var j = 0; j < _implements.length; j++) {
            for (i = 0, len = _implements[j].operations.length; i < len; i++) {
                this.writeMethod(codeWriter, _implements[j].operations[i], options, false, false);
                codeWriter.writeLine();
            }
        }
        /*
        // Inner Definitions
        for (i = 0, len = elem.ownedElements.length; i < len; i++) {
            var def = elem.ownedElements[i];
            if (def instanceof type.UMLClass) {
                if (def.stereotype === "annotationType") {
                    this.writeAnnotationType(codeWriter, def, options);
                } else {
                    this.writeClass(codeWriter, def, options);
                }
                codeWriter.writeLine();
            } else if (def instanceof type.UMLInterface) {
                this.writeInterface(codeWriter, def, options);
                codeWriter.writeLine();
            } else if (def instanceof type.UMLEnumeration) {
                this.writeEnum(codeWriter, def, options);
                codeWriter.writeLine();
            }
        }
        */

        codeWriter.outdent();
        codeWriter.writeLine("}");
    };

    /**
     * Write Interface
     * @param {StringWriter} codeWriter
     * @param {type.Model} elem
     * @param {Object} options
     */
    GolangCodeGenerator.prototype.writeInterface = function (codeWriter, elem, options) {
        var i,
            len,
            terms = [];

        // Doc
        this.writeDoc(codeWriter, elem.documentation, options);

        // Modifiers
        var visibility = this.getVisibility(elem);
        if (visibility) {
            terms.push(visibility);
        }

        // Interface
        terms.push("interface");
        terms.push(elem.name);

        // Extends
        var _extends = this.getSuperClasses(elem);
        if (_extends.length > 0) {
            terms.push("extends " + _.map(_extends, function (e) {
                return e.name;
            }).join(", "));
        }
        codeWriter.writeLine(terms.join(" ") + " {");
        codeWriter.writeLine();
        codeWriter.indent();

        // Member Variables
        // (from attributes)
        for (i = 0, len = elem.attributes.length; i < len; i++) {
            this.writeMemberVariable(codeWriter, elem.attributes[i], options);
            codeWriter.writeLine();
        }
        // (from associations)
        var associations = Repository.getRelationshipsOf(elem, function (rel) {
            return rel instanceof type.UMLAssociation;
        });
        for (i = 0, len = associations.length; i < len; i++) {
            var asso = associations[i];
            if (asso.end1.reference === elem && asso.end2.navigable === true) {
                this.writeMemberVariable(codeWriter, asso.end2, options);
                codeWriter.writeLine();
            }
            if (asso.end2.reference === elem && asso.end1.navigable === true) {
                this.writeMemberVariable(codeWriter, asso.end1, options);
                codeWriter.writeLine();
            }
        }

        // Methods
        for (i = 0, len = elem.operations.length; i < len; i++) {
            this.writeMethod(codeWriter, elem.operations[i], options, true, false);
            codeWriter.writeLine();
        }

        // Inner Definitions
        for (i = 0, len = elem.ownedElements.length; i < len; i++) {
            var def = elem.ownedElements[i];
            if (def instanceof type.UMLClass) {
                if (def.stereotype === "annotationType") {
                    this.writeAnnotationType(codeWriter, def, options);
                } else {
                    this.writeClass(codeWriter, def, options);
                }
                codeWriter.writeLine();
            } else if (def instanceof type.UMLInterface) {
                this.writeInterface(codeWriter, def, options);
                codeWriter.writeLine();
            } else if (def instanceof type.UMLEnumeration) {
                this.writeEnum(codeWriter, def, options);
                codeWriter.writeLine();
            }
        }

        codeWriter.outdent();
        codeWriter.writeLine("}");
    };

    /**
     * Write Enum
     * @param {StringWriter} codeWriter
     * @param {type.Model} elem
     * @param {Object} options
     */
    GolangCodeGenerator.prototype.writeEnum = function (codeWriter, elem, options) {
        var i,
            len,
            terms = [];
        // Doc
        this.writeDoc(codeWriter, elem.documentation, options);

        // Modifiers
        var visibility = this.getVisibility(elem);
        if (visibility) {
            terms.push(visibility);
        }
        // Enum
        terms.push("enum");
        terms.push(elem.name);

        codeWriter.writeLine(terms.join(" ") + " {");
        codeWriter.indent();

        // Literals
        for (i = 0, len = elem.literals.length; i < len; i++) {
            codeWriter.writeLine(elem.literals[i].name + (i < elem.literals.length - 1 ? "," : ""));
        }

        codeWriter.outdent();
        codeWriter.writeLine("}");
    };

    /**
     * Write AnnotationType
     * @param {StringWriter} codeWriter
     * @param {type.Model} elem
     * @param {Object} options
     */
    GolangCodeGenerator.prototype.writeAnnotationType = function (codeWriter, elem, options) {
        var i,
            len,
            terms = [];

        // Doc
        var doc = elem.documentation.trim();
        if (ProjectManager.getProject().author && ProjectManager.getProject().author.length > 0) {
            doc += "\n@author " + ProjectManager.getProject().author;
        }
        this.writeDoc(codeWriter, doc, options);

        // Modifiers
        var _modifiers = this.getModifiers(elem);
        if (_.contains(_modifiers, "abstract") !== true && _.some(elem.operations, function (op) {
            return op.isAbstract === true;
        })) {
            _modifiers.push("abstract");
        }
        if (_modifiers.length > 0) {
            terms.push(_modifiers.join(" "));
        }

        // AnnotationType
        terms.push("@interface");
        terms.push(elem.name);

        codeWriter.writeLine(terms.join(" ") + " {");
        codeWriter.writeLine();
        codeWriter.indent();

        // Member Variables
        for (i = 0, len = elem.attributes.length; i < len; i++) {
            this.writeMemberVariable(codeWriter, elem.attributes[i], options);
            codeWriter.writeLine();
        }

        // Methods
        for (i = 0, len = elem.operations.length; i < len; i++) {
            this.writeMethod(codeWriter, elem.operations[i], options, true, true);
            codeWriter.writeLine();
        }

        // Extends methods
        if (_extends.length > 0) {
            for (i = 0, len = _extends[0].operations.length; i < len; i++) {
                _modifiers = this.getModifiers(_extends[0].operations[i]);
                if (_.contains(_modifiers, "abstract") === true) {
                    this.writeMethod(codeWriter, _extends[0].operations[i], options, false, false);
                    codeWriter.writeLine();
                }
            }
        }

        // Inner Definitions
        for (i = 0, len = elem.ownedElements.length; i < len; i++) {
            var def = elem.ownedElements[i];
            if (def instanceof type.UMLClass) {
                if (def.stereotype === "annotationType") {
                    this.writeAnnotationType(codeWriter, def, options);
                } else {
                    this.writeClass(codeWriter, def, options);
                }
                codeWriter.writeLine();
            } else if (def instanceof type.UMLInterface) {
                this.writeInterface(codeWriter, def, options);
                codeWriter.writeLine();
            } else if (def instanceof type.UMLEnumeration) {
                this.writeEnum(codeWriter, def, options);
                codeWriter.writeLine();
            }
        }

        codeWriter.outdent();
        codeWriter.writeLine("}");
    };

    /**
     * Generate
     * @param {type.Model} baseModel
     * @param {string} basePath
     * @param {Object} options
     */
    function generate(baseModel, basePath, options) {
        var result = new $.Deferred();

        var golangCodeGenerator = new GolangCodeGenerator(baseModel, basePath);
        return golangCodeGenerator.generate(baseModel, basePath, options);
    }

    exports.generate = generate;
});

//# sourceMappingURL=GolangCodeGenerator-compiled.js.map