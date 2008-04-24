/**
 * @author Keith Hughitt     keith.hughitt@gmail.com
 * @author Patrick Schmiedel patrick.schmiedel@gmx.net
 */
/**
 * @class LayerManagerUI A UI Component for managing layers.
 * @see   LayerManager
/*global Class, document, $ */
var LayerManagerUI = Class.create();

LayerManagerUI.prototype = {
    /**
     * @constructor
     */
    initialize: function (htmlContainer){
        this.className = "layerManagerUI";
        this.container = $(htmlContainer);
        this.layerSettings = new Hash();
        
        // Call methods to construct initial layer manager menu and setup event-handlers
        this.createMenu();
        this.initEvents();
        
        /**
         * @NOTE: Another option to simply storing the layer's associated <tr> would be to store
         * an object which contains each of the relevent sub-DOM nodes in an easily accesible manor, e.g:
         * 
         * layerSettings.get(i).enabled
         * layerSettings.get(i).opacity
         * 
         * At the same time, however, it's important to avoid ambiguity between the LMUI and the LM
         * for these items.. maybe use ".enabledDOM" instead. 
         */
    },
    
    /**
     * @method createMenu
     * This method handles setting up an empty layer manager menu, including column headers and an
     * empty table body. Later on as layers are added via "addMenuEntry," the rows will be placed
     * in the table body created below.
     */
    createMenu: function (){
        //toggleButton
        this.toggleButton = Builder.node('a', {'href': '#', className: 'gray'}, 'Layers');
        this.container.appendChild(this.toggleButton);
        
        //Hidable menu
        this.menuContainer = Builder.node ('div', {style: 'display: none'});
        this.container.appendChild(this.menuContainer);
        
        this.menu  = Builder.node ('div', {id: 'layerManager-Menu', style: 'width:100%; height:95%; background-color:#E5E5E5; border: 1px solid black;'});
        this.menuContainer.appendChild(this.menu);
        
        //Menu table 
        this.menuTable = Builder.node ('table', {id: 'layerManager-Menu-Table', width: '100%',cellpadding: '2',cellspacing: '0',border: '0'});
        
        //Menu table headers
        var thead = Builder.node('thead');
        var tr    = Builder.node('tr', {id: 'layerManagerHeaders'});
        tr.appendChild(Builder.node('th', 'Instrument'));
        tr.appendChild(Builder.node('th', 'Wavelength'));
        tr.appendChild(Builder.node('th', 'Opacity'));
        tr.appendChild(Builder.node('th', 'Enabled'));
        tr.appendChild(Builder.node('th', 'Remove'));
        tr.appendChild(Builder.node('th', 'Move'));
        
        thead.appendChild(tr);
        this.menuTable.appendChild(thead);
        
        //Menu table body
        this.menuTableTbody = Builder.node('tbody');
        this.menuTable.appendChild(this.menuTableTbody);
        
        //Add completed table to the menu container
        this.menu.appendChild(this.menuTable);
    },
    
    /**
     * @method initEvents
     * This method handles setting up event-handlers for functionality related to the menu as a whole,
     * and not for particular layers. This includes adding and removing layers, and toggling the visibility
     * of the menu itself.
     */
    initEvents: function (){
        document.layerPrepared.subscribe(this.onLayerAdded, this, true);
        document.layerRemoved.subscribe(this.onLayerRemoved, this, true);
       
        // Toggle to hide/display layer manager menu
        Event.observe(this.toggleButton, 'click', this.onToggleButtonClick.bindAsEventListener(this));
    },
    
    /**
     * @method addMenuEntry
     * @param {LayerProvider} layerProvider
     * This method creates a single entry in the layer manager menu corresponding to the layer associated
     * with "layerProvider." The options to display vary based on the type of layer. Once constructed, the DOM
     * element (a single table row) is stored in an array for future referencing, using the same id as that
     * used by the DataNavigator. 
     */
     /*
      * NOTE: Currently, when layers (xxLayerProviders) are initialized, they are only partially setup. layerProvider.sunImage,
      * which contains important information related to the layer is not initialized until later when an 'onImageChange' event
      * is fired, and triggers setSunImage() to execute.
      *    UPDATE 04-24-2008: Fixed... Added a second event, "layerPrepared," to signal that complete layerProvider is ready..
      * 
      * Once the new layer manager is functional, it would be beneficial to go back and change this so that all relevent information
      * for a layer is set at the onset, and thus other parts of the system can execute without having to wait first for a 'sunimage'
      * to be set. (An ideal solution will involve removing the sunImage concept, and a redsign of the layer classes) 
      */
    addMenuEntry: function (layerProvider) {
        var tr = Builder.node('tr');
        var id = this.layerSettings.size();
        
        // Items to display depends on the type of layer added.
        switch (layerProvider.type) {
            case 'TileLayerProvider':
                tr.appendChild(this.createInstrumentControl(layerProvider));
                if (layerProvider.sunImage.instrument === "EIT") {
                    tr.appendChild(this.createWavelengthControl(id));
                }
                tr.appendChild(this.createOpacityControl(layerProvider));
                break;
            case 'MarkerLayerProvider':
                tr.appendChild(Builder.node('td', {'colspan': 3}, 'Events'));
                break;
            default:
                tr.appendChild(Builder.node('td', 'Unknown Layer'));
                break;
        }
        // Enable/Disable layer checkbox
        //tr.appendChild(this.createEnabledBox(layerProvider));
        tr.appendChild(this.createEnabledBox(id));
        
        // Add an id as a hideen form field
        tr.appendChild(Builder.node('input', {type: 'hidden', name:'id', value:id}));
        
        // Append row to menu
        this.menuTableTbody.appendChild(tr);
        
        // Add to hash
        this.layerSettings.set(id, tr);
    },
    
    /**
     * @method createInstrumentControl
     */
    createInstrumentControl: function (layerProvider) {
        inst = new Element('select', {className: 'instrumentSelect'});
        inst.length = 0;

        var instruments = $A(["EIT", "LAS"]);
                
        // Populate list of available wavelengths
        for (var i = 0; i < instruments.length; i++) {
            var opt = new Option(instruments[i]);
            opt.value = instruments[i];
            inst.options[inst.options.length] = opt;
        }
        
        // Set-up event handler to deal with an wavelength change
        Event.observe(inst, 'change', this.onInstrumentChange.curry(this, this.layerSettings.size()));
        
        return new Element('td').update(inst);
    },
    
    /**
     * @method onInstrumentChange
     */
    onInstrumentChange: function (selfRef, id) {
        //tr dom-node for the current row
        var tr = selfRef.layerSettings.get(id);
        
        //Non-pretty solution... TODO: Create a function to handle parameter changes..
        if (this.value === "LAS") {
            tr.childElements()[1].hide();
        }
        else {
            tr.childElements()[1].show();
        }

        document.instrumentChange.fire(id, this.value);
    },
    
    /**
     * @method createWavelengthControl
     */
    createWavelengthControl: function (id) {
        var wl = new Element('select', {className: 'wavelengthSelect'});
        wl.length = 0;

        var wavelengths = $A([171, 195, 284]);
                
        // Populate list of available wavelengths
        for (var i = 0; i < wavelengths.length; i++) {
            var opt = new Option(wavelengths[i]);
            opt.value = wavelengths[i];
            wl.options[wl.options.length] = opt;
        }
        
        // Set-up event handler to deal with an wavelength change
        Event.observe(wl, 'change', this.onWavelengthChange.curry(id));
        
        return new Element('td').update(wl);
    },
    
    /**
     * Event handler: wavelength change
     */ 
    onWavelengthChange: function (id) {
        document.wavelengthChange.fire(id, this.value);
    },
    
    /**
     * @method createOpacityControl Creates the opacity control cell.
     * @param  {LayerProvider}      The layer provider associated with the opacity control.
     * @return {HTML Element}       The opacity control cell.
     */
    createOpacityControl: function (layerProvider) {
        var opacity = Math.round(layerProvider.opacity * 100);
        
        var opacityTd =    new Element('td');
        var opacityInput = new Element('input', {size: '3', value: opacity});
        var opacityInputChange = layerProvider.setOpacity.bind(layerProvider);
        Event.observe(opacityInput, 'change', function () {
            opacityInputChange(parseInt(this.value, 10) / 100);
        });
        opacityTd.appendChild(opacityInput);
        opacityTd.insert('%');
        return opacityTd;
    },
    
    /**
     * @method createEnabledBox Creates the enabled/disabled cell.
     * @return {HTML Element}   The enabled/disabled cell.
     * @param  {Integer}        The layer's id
     */
    createEnabledBox: function (id) {
        var enabledTd = new Element('td');
        var enabled =   new Element('input', {type: 'checkbox', checked: 'true', name: 'enabled'});
        enabledTd.appendChild(enabled);
        
        Event.observe(enabled, 'click', this.onEnabledBoxClick.bind(this, id));
        return enabledTd;
    },
    
    /**
     * @method onEnabledBoxClick
     * @param {Int} id
     */
    onEnabledBoxClick: function (id) {
        var tr = Object.clone(this.layerSettings.get(id));
         
        //Enable or disable other form items
        //Form.getElements(Builder.node('form', [tr])).each(function(e) {
        //    if (e.name !== "enabled") {
        //        e.disable();
        //    }
        //});
        
        //Fire global event

        Debug.output('enabledBox clicked!');
    },
     
     /**
     * @method toggleLayerEnabled   Enables or disables a layer.
     * @param {Boolean} enabled     Whether to enable or disable the layer.
     */
    toggleLayerEnabledDDD: function (tr, layerProvider, enabled) {
        layerProvider.toggleVisible(enabled);
        //var inputs = $A($(this.domNode.getElementsByTagName('input'))).concat($A($(this.domNode.getElementsByTagName('select'))));
        var inputs = $A($(tr.getElementsByTagName('input'))).concat($A($(tr.getElementsByTagName('select'))));
        for (var i = 0; i < inputs.length; i++) {
            //if (inputs[i] !== this.enabledBox) {
                inputs[i].disabled = !enabled;
            //}
        }
    },
   
    /**
     * @method onLayerAdded
     */
    onLayerAdded: function (type, args) {
        var layerProvider = args[0];
        this.addMenuEntry(layerProvider);          
    },
     
    /**
     * @method onLayerRemoved
     */
    onLayerRemoved: function (type, args) {
          
    },
    
    /**
     * @method onToggleButtonClick
     */
    onToggleButtonClick: function () {
        Effect.toggle(this.menuContainer, 'slide', {duration:0.4});
    }
};

/**
 * Functions to include:
 *  - 
 *  - AdLayer
 *  - RemoveLayer
 * 
 */