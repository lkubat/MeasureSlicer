/*
 *  Power BI Visual CLI
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

module powerbi.extensibility.visual {
    /**
     * Interface for MeasureSlicer viewmodel.
     *
     * @interface
     * @property {MeasureSlicerDataPoint[]} dataPoints - Set of data points the visual can filter.
     * @property {MeasureSlicerValue[]} values - Set of values the visual will render.
     */
    interface MeasureSlicerViewModel {
        selectionIds: MeasureSlicerSelectionIds;
        settings: MeasureSlicerSettings;
    };
    interface MeasureSlicerSelectionIds {
        [key: string]: ISelectionId[];
    };
    interface MeasureSlicerValue {
        value: string;
        selectionIds: ISelectionId[];
    }
    /**
     * Interface for MeasureSlicer settings.
     *
     * @interface
     * @property {{show:boolean}} enableAxis - Object property that allows axis to be enabled.
     */
    interface MeasureSlicerSettings {
        generalOptions: {
            sizeOfText: number;
            defaultSelection: string;
        };
    }
    /**
    * Function that converts queried data into a view model that will be used by the visual
    *
    * @function
    * @param {VisualUpdateOptions} options - Contains references to the size of the container
    *                                        and the dataView which contains all the data
    *                                        the visual had queried.
    * @param {IVisualHost} host            - Contains references to the host which contains services
    */
    function visualTransform(options: VisualUpdateOptions, host: IVisualHost): MeasureSlicerViewModel {
        let dataViews = options.dataViews;
        let defaultSettings: MeasureSlicerSettings = {
            generalOptions: {
                sizeOfText: 8,
                defaultSelection: ''
            }
        };
        let viewModel: MeasureSlicerViewModel = {
            selectionIds: {},
            settings: defaultSettings 
        };
        if (!dataViews
            || !dataViews[0]
            || !dataViews[0].categorical
            || !dataViews[0].categorical.categories
            || !dataViews[0].categorical.categories[0].source
            || !dataViews[0].categorical.values)
            return viewModel;

        let objects = dataViews[0].metadata.objects;
        let settings: MeasureSlicerSettings = {
            generalOptions: {
                sizeOfText: getValue<number>(objects, 'generalOptions', 'sizeOfText', defaultSettings.generalOptions.sizeOfText),
                defaultSelection: getValue<string>(objects, 'generalOptions', 'defaultSelection', defaultSettings.generalOptions.defaultSelection),
            }
        }

        let categorical = dataViews[0].categorical;
        let category = categorical.categories[0];
        let dataValue = categorical.values[0];
        let selectionIds: MeasureSlicerSelectionIds = {};

        for (let i = 0, len = Math.max(category.values.length, dataValue.values.length); i < len; i++) {
            let value: string = <string>dataValue.values[i];
            if (typeof selectionIds[value] === "undefined") {
                selectionIds[value] = [];
            }
            selectionIds[value].push(
                host.createSelectionIdBuilder()
                    .withCategory(category, i)
                    .createSelectionId()
            );
        }

        return {
            selectionIds: selectionIds,
            settings: settings 
        };
    }
    export class MeasureSlicer implements IVisual {
        private target: HTMLElement;
        private host: IVisualHost;
        private slicerContainer: d3.Selection<HTMLDivElement>;
        private selectionManager: ISelectionManager;
        private selectedValues: MeasureSlicerSelectionIds;
        private measureSlicerSettings: MeasureSlicerSettings;
        /**
        * Creates instance of BarChart. This method is only called once.
        *
        * @constructor
        * @param {VisualConstructorOptions} options - Contains references to the element that will
        *                                             contain the visual and a reference to the host
        *                                             which contains services.
        */
        constructor(options: VisualConstructorOptions) {
            this.host = options.host;
            this.target = options.element;
            this.selectionManager = options.host.createSelectionManager();
            this.slicerContainer = d3.select(options.element)
                .append('div')
                .classed('slicerContainer', true)
                .style('overflow-y','auto');
        }

        /**
        * Updates the state of the visual. Every sequential databinding and resize will call update.
        *
        * @function
        * @param {VisualUpdateOptions} options - Contains references to the size of the container
        *                                        and the dataView which contains all the data
        *                                        the visual had queried.
        */
        public update(options: VisualUpdateOptions) {
            let viewModel: MeasureSlicerViewModel = visualTransform(options, this.host);
            let settings = this.measureSlicerSettings = viewModel.settings;
            this.slicerContainer.html('');
            this.slicerContainer
                .style('height', options.viewport.height + "px")
                .style('font-size', settings.generalOptions.sizeOfText + 'pt')
                .attr('height', options.viewport.height);

            if (this.selectedValues === undefined) {
                if (settings.generalOptions.defaultSelection) {
                    if (!(viewModel.selectionIds[settings.generalOptions.defaultSelection] === undefined)) {
                        this.selectedValues = {};
                        this.selectedValues[settings.generalOptions.defaultSelection] = viewModel.selectionIds[settings.generalOptions.defaultSelection];
                        this.selectionManager.select(this.selectedValues[settings.generalOptions.defaultSelection]);
                    }
                }
            }
            let selectionManager = this.selectionManager;
            let currentSelection = this.selectedValues;
            let lines = this.slicerContainer.selectAll('.slicerLine').data(d3.keys(viewModel.selectionIds));
            lines.enter()
                .append('div')
                .classed('slicerLine', true);
            let boxes = lines
                    .append("input")
                    .attr("type", "checkbox")
                    .style('height', settings.generalOptions.sizeOfText + 'pt')
                    .attr("id", function (d, i) { return 'a' + i; })
                    .classed('slicerCheckbox', true)
                    .property('checked', function (checkboxValueStr) {
                        if (currentSelection) {
                            return !(typeof currentSelection[checkboxValueStr] === "undefined");
                        } else {
                            return false;
                        }
                    });
            let labels = lines
                .append('label')
                .attr('for', function (d, i) { return 'a' + i; })
                .text(function (d) { return d; });

            //This must be an anonymous function instead of a lambda because
            //d3 uses 'this' as the reference to the element that was clicked.
            lines.selectAll('.slicerCheckbox').on('click', function (clickedValueStr) {
                if (!currentSelection) {
                    currentSelection = {};
                }
                if (typeof currentSelection[clickedValueStr] === "undefined") {
                    if (!(<MouseEvent>d3.event).ctrlKey) {
                        d3.keys(currentSelection).forEach(function (selectedValueStr) {
                            delete currentSelection[selectedValueStr];
                        });
                    }
                    currentSelection[clickedValueStr] = viewModel.selectionIds[clickedValueStr];
                } else {
                    delete currentSelection[clickedValueStr];
                }
                let newSelectionIds: ISelectionId[] = [];
                d3.keys(currentSelection).forEach(function (selectedValueStr) {
                    newSelectionIds = newSelectionIds.concat(currentSelection[selectedValueStr]);
                });
                if (newSelectionIds.length == 0) {
                    selectionManager.clear();
                } else {
                    selectionManager.select(newSelectionIds).then((ids: ISelectionId[]) => {
                        lines.selectAll('input')
                            .property('checked', function (checkboxValueStr) {
                                return !(typeof currentSelection[checkboxValueStr] === "undefined");
                            });
                    });
                }
                (<Event>d3.event).stopPropagation();
            });

            lines.exit().remove();
        }  
        /**
         * Enumerates through the objects defined in the capabilities and adds the properties to the format pane
         *
         * @function
         * @param {EnumerateVisualObjectInstancesOptions} options - Map of defined objects
         */
        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration {
            let objectName = options.objectName;
            let objectEnumeration: VisualObjectInstance[] = [];
            switch (objectName) {
                case 'generalOptions':
                    objectEnumeration.push({
                        objectName: objectName,
                        properties: {
                            sizeOfText: this.measureSlicerSettings.generalOptions.sizeOfText,
                            defaultSelection: this.measureSlicerSettings.generalOptions.defaultSelection
                        },
                        selector: null
                    });
            };

            return objectEnumeration;
        }


    }
}