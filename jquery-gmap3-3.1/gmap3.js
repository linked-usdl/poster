/*
 *  GMAP3 Plugin for JQuery 
 *  Version   : 3.1
 *  Date      : 2011-04-16
 *  Licence   : GPL v3 : http://www.gnu.org/licenses/gpl.html  
 *  Author    : DEMONTE Jean-Baptiste
 *  Contact   : jbdemonte@gmail.com
 *  Web site  : http://gmap3.net      
 */
 
(function ($) {

  /***************************************************************************/
  /*                                STACK                                    */
  /***************************************************************************/
  function Stack (){
    var st={};
    this.init = function (id){
      if (!st[id]){
        st[id] = [];
      }
    }
    this.empty = function (id){
      var k;
      if (!st[id]) {
        return true;
      }    
      for(k in st[id]){
        if (st[id][k]){
          return false
        }
      }
      return true;
    }
    this.add = function (id, v){
      this.init(id);
      st[id].push(v);
    }
    this.addNext = function (id, v){
      var t=[], i=0, k;
      this.init(id);
      for(k in st[id]){
        if (i == 1) {
          t.push(v);
        }
        t.push(st[id][k]);
        i++;
      }
      if (i < 2) t.push(v);
      st[id] = t;
    }
    this.get = function (id){
      var k;
      if (st[id]){
        for(k in st[id]){
          if (st[id][k]) return st[id][k];
        }
      }
      return false;
    }
    this.ack = function (id){
      var k;
      if (st[id]) {
        for(k in st[id]){                     
          if (st[id][k]) {
            delete st[id][k];
            break;
          }
        }
        if (this.empty(id)){
          delete st[id];
        }
      }
    }
  }
  /***************************************************************************/
  /*                              CLUSTERER                                  */
  /***************************************************************************/

  function Clusterer(){
    var markers = [], events=[], dom=[];
    
    this.events = function(){
      for(var i=0; i<arguments.length; i++){
        events.push(arguments[i]);
      }
    }
    
    this.redraw = function(){};
    
    this.setRedraw = function(fnc){
      this.redraw  = fnc;
    }
    
    this.store = function(obj){
      dom.push(obj);
    }
    
    this.free = function(){
      for(k in events){
        google.maps.event.removeListener(events[k]);
      }
      events=[];
      this.freeDom();
    }
    
    this.freeDom = function(){
      var i, j;
      for(i in dom){
        if (typeof(dom[i].setMap) === 'function') dom[i].setMap(null);
        if (typeof(dom[i].remove) === 'function') dom[i].remove();
        delete dom[i];
      }
      dom = [];
    }
    
    this.add = function(latLng, marker){
      markers.push([latLng.lat(), latLng.lng(), marker]);
    }
    
    this.get = function(i){
      return markers[i];
    }
    
    // this function doesn't use sub-function in loop (distance, ...) to get faster
    this.clusters = function(radius, bounds, currents, fullCheck){
      var add, i, j, k, cluster, clusters=[], done, lat, lng, keys={}, tmps=[], cos=[], sin=[], rad = radius / 3959,
          e,f,g,h,q=Math.PI/180,ce,se,cf,sf, updated = currents === undefined;
      for(i in markers){
        if (!bounds.contains(new google.maps.LatLng(markers[i][0], markers[i][1]))){
          continue;
        }
        keys[i] = true;
        if (!updated && !(i in currents.keys)){
          updated = true;
        }
        //                  LAT                        LNG
        cos[i] = [Math.cos(q*markers[i][0]),Math.cos(q*markers[i][1])];
        sin[i] = [Math.sin(q*markers[i][0]),Math.sin(q*markers[i][1])];
      }
      if (!updated){
        for(i in currents.keys){
          if (!(i in keys)){
            updated = true;
            break;
          }
        }
        if (!updated && !fullCheck){
          currents.updated = false;
          return currents;
        }
      }
      for(i in markers){
        if (!keys[i]){
          continue;
        }
        tmps[i]=[];
        for(j = i; j < markers.length; j++){
          if (keys[j] && (Math.acos(Math.min(cos[i][0]*cos[j][0]*cos[i][1]*cos[j][1]+cos[i][0]*sin[i][1]*cos[j][0]*sin[j][1]+sin[i][0]*sin[j][0], 1)) <= rad)){
            tmps[i].push(j);
          }
        }
      }
      do{
        cluster = null;
        // Search the bigest cluster from each point
        l = 0;
        for(i = 0; i < tmps.length; i++){
          if (tmps[i] && (tmps[i].length > l)){
            l = tmps[i].length;
            cluster = tmps[i];
          }
        }
        
        if (cluster){
          // search the center of this cluster, and search a bigger cluster from this point
          do{
            lat=lng=0;
            len = cluster.length;
            for(k in cluster){
              i = cluster[k];
              lat += markers[i][0];
              lng += markers[i][1];
            }
            lat = lat / len;
            lng = lng / len;
            e=q*lat;
            ce=Math.cos(e);
            se=Math.sin(e);
            f=q*lng;
            cf=Math.cos(f);
            sf=Math.sin(f);
            tmp = [];
            done = {};
            for(i in cluster){
              for(j in markers[cluster[i]]){
                if (!done[j] && tmps[j]){ // the marker must still be in tmps, else, has already been affected to a cluster
                  done[j] = true;
                  g=q*markers[j][0];
                  h=q*markers[j][1];
                  if (Math.acos(Math.min(ce*cos[j][0]*cf*cos[j][1]+ce*sf*cos[j][0]*sin[j][1]+se*sin[j][0],1)) <= rad){
                    tmp.push(j);
                  }
                }
              }
            }
            if (tmp.length > cluster.length){
              cluster = tmp;
            }
          } while(cluster.length > len);
          
          // remove used keys from all clusters
          for(k in cluster){
            tmps[cluster[k]] = null;
          }
          // re-create tabs
          for(k in tmps){
            if (tmps[k]){
              tmp = [];
              for(i in tmps[k]){
                if (tmps[tmps[k][i]]){
                  tmp.push(tmps[k][i]);
                }
              }
              tmps[k] = tmp.length ? tmp : null;
            }
          }
          clusters.push({lat:lat, lng:lng, idx:cluster});
        }
      } while(cluster);
      
      if (!updated && fullCheck){
        updated = currents.clusters.length !== clusters.length;
      }
      return {updated:updated, keys:keys, clusters:clusters};
    }
  }

  /***************************************************************************/
  /*                                GMAP3                                    */
  /***************************************************************************/
  
  var gmap3 = {
    _ids:{},
    _properties:['events','onces','options','apply', 'callback', 'data'],
    
    _default:{
      verbose:false,
      retro: false,
      unit: 'mi',
      init:{
        mapTypeId : google.maps.MapTypeId.ROADMAP,
        center:[46.578498,2.457275],
        zoom: 2
      }
    },
    _running:{
    },
    _stack: new Stack(),
    /**
     * @desc create default structure if not existing
     **/
    _init: function($this, id){
      if (!this._ids[id]) {
        this._ids[id] = {
          $this:$this,
          styles: {},
          stored:{},
          map:null
        };
      }
    },
    /**
     * @desc store actions to do in a stack manager
     **/
    _plan: function($this, id, list){
      var k;
      this._init($this, id);
      for(k in list) this._stack.add(id, list[k] );
      this._run(id);
    },
    /**
     * @desc return true if action has to be executed directly
     **/
    _isDirect: function(id, data){
      var action = this._ival(data, 'action'),
          directs = {
            distance    :true,
            earthradius :true,
            get         :true
          };
      return action in directs;
    },
    /**
     * @desc execute action directly
     **/
    _direct: function(id, data){
      var action = this._ival(data, 'action');
      if (action.substr(0,1) == ':'){
        action = action.substr(1);
      }
      return this[action](id, $.extend({}, this._default[action], data.args ? data.args : data));
    }, 
    /**
     * @desc store one action to do in a stack manager after the first
     **/
    _planNext: function(id, a){
      var $this = this._jObject(id);
      this._init($this, id);
      this._stack.addNext(id, a);
    },
    /**
     * @desc called when action in finished, to acknoledge the current in stack and start next one
     **/
    _end: function(id){
      delete this._running[id];
      this._stack.ack(id);
      this._run(id);
    },
    /**
     * @desc if not running, start next action in stack
     **/
    _run: function(id){
      if (this._running[id]) return;
      var a = this._stack.get(id);
      if (!a) return;
      this._running[id] = true;
      this._proceed(id, a);
    },
    
    _geocoder: null,
    _getGeocoder: function(){
      if (!this._geocoder) this._geocoder = new google.maps.Geocoder();
      return this._geocoder;
    },
    
    _directionsService: null,
    _getDirectionsService: function(){
      if (!this._directionsService) this._directionsService = new google.maps.DirectionsService();
      return this._directionsService;
    },
    
    _elevationService: null,
    _getElevationService: function(){
      if (!this._elevationService) this._elevationService = new google.maps.ElevationService();
      return this._elevationService;
    },
    
    _maxZoomService:null,
    _getMaxZoomService: function(){
      if (!this._maxZoomService) this._maxZoomService = new google.maps.MaxZoomService();
      return this._maxZoomService;
    },
    
    _getMap: function( id ){
      return this._ids[id].map;
    },
    
    _setMap: function (id, map){
      this._ids[id].map = map;
    },
    
    _jObject: function( id ){
      return this._ids[id].$this;
    },
    
    _addStyle: function(id, styleId, style){
      this._ids[id].styles[ styleId ] = style;
    },
    
    _getStyles: function(id){
      return this._ids[id].styles;
    },
    
    _getStyle: function(id, styleId){
      return this._ids[id].styles[ styleId ];
    },
    
    _styleExist: function(id, styleId){
      return this._ids[id] && this._ids[id].styles[ styleId ];
    },
    
    _getDirectionRenderer: function(id){
      return this._getFirstStored(id, 'directionrenderer');
    },
    
    _exist: function(id){
      return this._ids[id].map ? true : false;
    },
    
    /**
     * @desc return last non-null object
     **/
    _getFirstStored: function(id, name){
      var idx = 0;
      if (this._ids[id].stored[name] && this._ids[id].stored[name].length ){
        while(idx < this._ids[id].stored[name].length){
          if (this._ids[id].stored[name][idx]){
            return this._ids[id].stored[name][idx];
          }
          idx++;
        }
      }
      return null;
    },
    
    /**
     * @desc return last non-null object
     **/
    _getLastStored: function(id, name){ 
      var idx;
      if (this._ids[id].stored[name] && this._ids[id].stored[name].length ){
        idx = this._ids[id].stored[name].length - 1;
        do{
          if (this._ids[id].stored[name][idx]){
            return this._ids[id].stored[name][idx];
          }
          idx--;
        }while(idx >= 0);
      }
      return null;
    },
    
    /**
     * @desc return an object from its reference
     **/
    _getStoredId: function(id, ref){
      ref = ref.split('-');
      if ((ref.length == 2) && this._ids[id].stored[ref[0]] && this._ids[id].stored[ref[0]][ref[1]]){
        return this._ids[id].stored[ref[0]][ref[1]];
      }
      return null;
    },
    
    /**
     * @desc add an object in the stored structure
     **/
    _store: function(id, name, data){
      name = name.toLowerCase();
      if (!this._ids[id].stored[name])
          this._ids[id].stored[name] = new Array();
      this._ids[id].stored[name].push(data);
      return name + '-' + (this._ids[id].stored[name].length-1);
    },
    
    /**
     * @desc remove an object from the stored structure
     **/
    _unstore: function(id, name, pop){
      var idx, t = this._ids[id].stored[name];
      if (!t) return false;
      idx = pop ? t.length - 1 : 0;
      if (t[idx] === undefined) return false;
      if (typeof(t[idx].setMap) === 'function') t[idx].setMap(null);  // Google Map element
      if (typeof(t[idx].remove) === 'function') t[idx].remove();      // JQuery
      if (typeof(t[idx].free) === 'function') t[idx].free();          // internal (cluster)
      delete t[idx];
      if (pop) {
        t.pop();
      } else {
        t.shift();
      }
      return true;
    },
    
    /**
     * @desc manage remove objects
     **/
    _clear: function(id, list, last, first){
      var k, n, i;
      if (!list || !list.length){
        list = [];
        for(k in this._ids[id].stored) 
          list.push(k);
      }
      for(k in list){
        n = list[k].toLowerCase();
        if (!this._ids[id].stored[n]) continue;
        if (last){
          this._unstore(id, n, true);
        } else if (first){
          this._unstore(id, n, false);
        } else {
          while (this._unstore(id, n, false));
        }
      }
    },
    
    /**
     * @desc return true if "init" action must be run
     **/
    _autoInit: function(name){
      var k,
          fl = name.substr(0,1),
          names = [
            'init', 
            'geolatlng', 
            'getlatlng', 
            'getroute',
            'getelevation', 
            'addstyledmap',
            'setdefault', 
            'destroy'
          ];
      if ( !name ) return true;
      for(k in names){
        if (names[k] == name) return false;
      }
      return true;
    },
    /**
     * @desc call functions associated
     * @param
     *  id      : string
     *  action  : string : function wanted
     *     
     *  options : {}
     *     
     *    O1    : {}
     *    O2    : {}
     *    ...
     *    On    : {}
     *      => On : option : {}
     *          action : string : function name
     *          ... (depending of functions called)
     *             
     *  args    : [] : parameters for directs call to map
     *  target? : object : replace map to call function 
     **/
    _proceed: function(id, data){
      data = data || {};
      var action = this._ival(data, 'action') || 'init',
          iaction = action.toLowerCase(),
          ok = true,
          target = this._ival(data, 'target'), 
          args = this._ival(data, 'args'),
          map, out;
      if ( !this._exist(id) && this._autoInit(iaction) ){
        this.init(id, $.extend({}, this._default.init, data.args && data.args.map ? data.args.map : data.map ? data.map : {}), true);
      }
      if (!target && !args && (typeof(this[iaction]) === 'function')){
        // framework functions
        this[iaction](id, $.extend({}, this._default[iaction], data.args ? data.args : data)); // call fnc and extends defaults data
      } else {
        if (target && (typeof(target) === 'object')){
          if (typeof(target[action]) === 'function'){
            out = target[action].apply(target, data.args ? data.args : []);
          } else ok = false;
        // gm direct function :  no result so not rewrited, directly wrapped using array "args" as parameters (ie. setOptions, addMapType, ...)
        } else {
          map = this._getMap(id);
          if (typeof(map[action]) === 'function'){
            out = map[action].apply(map, data.args ? data.args : [] );
          } else ok = false;
        }
        if (!ok && this._default.verbose) alert("unknown action : " + action);
        this._callback(id, out, data);
        this._end(id);
      }
    },
    
    /**
     * @desc call a function of framework or google map object of the instance
     * @param
     *  id      : string : instance
     *  fncName : string : function name
     *  ... (depending on function called)
     **/
    _call: function(/* id, fncName [, ...] */){
      if (arguments.length < 2) return;
      if (!this._exist(arguments[0])) return ;
      var i, id = arguments[0],
          fname = arguments[1],
          map = this._getMap(id),
          args = [];
      if (typeof(map[ fname ]) !== 'function') {
        return;
      }
      for(i=2; i<arguments.length; i++){
        args.push(arguments[i]);
      }
      return map[ fname ].apply( map, args );
    },
    /**
     * @desc convert data to array
     **/
    _array: function(mixed){
      var k, a = [];
      if (mixed !== undefined){
        if (typeof(mixed) === 'object'){
          for(k in mixed) a.push(mixed[k]);
        } else{ 
          a.push(mixed);
        }
      }
      return a;
    },
    
    /**
     * @desc init if not and manage map subcall (zoom, center)
     **/
    _subcall: function(id, data, latLng){
      var opts = {};
      if (!data.map) return;
      if (!latLng) {
        latLng = this._ival(data.map, 'latlng');
      }
      if (!this._exist(id)){
        if (latLng) {
          opts = {center:latLng};
        }
        this.init(id, $.extend({}, data.map, opts), true);
      } else { 
        if (data.map.center && latLng) this._call(id, "setCenter", latLng);
        if (data.map.zoom !== undefined) this._call(id, "setZoom", data.map.zoom);
        if (data.map.mapTypeId !== undefined) this._call(id, "setMapTypeId", data.map.mapTypeId);
      }
    },
    
    /**
     * @desc attach an event to a sender (once) 
     **/
    _attachEvent: function(id, sender, name, f, data, once){
      var that=this, $o = this._jObject(id);
      google.maps.event['addListener'+(once?'Once':'')](sender, name, function(event) {
        if (that._default.retro === 2){
          f($o, sender, event, data);
        } else {
          f.apply($o, [sender, event, data]);
        }
      });
    },
    
    /**
     * @desc attach events from a container to a sender 
     * ctnr[
     *  events => { eventName => function, }
     *  onces  => { eventName => function, }  
     *  data   => mixed data         
     * ]
     **/
    _attachEvents : function(id, sender, ctnr){
      var name;
      if (!ctnr) return
      if (ctnr.events){
        for(name in ctnr.events){
          if (typeof(ctnr.events[name]) === 'function'){
            this._attachEvent(id, sender, name, ctnr.events[name], ctnr.data, false);
          }
        }
      }
      if (ctnr.onces){
        for(name in ctnr.onces){
          if (typeof(ctnr.onces[name]) === 'function'){
            this._attachEvent(id, sender, name, ctnr.onces[name], ctnr.data, true);
          }
        }
      }
    },
    
    /**
     * @desc execute callback functions 
     **/
    _callback: function(mixed, result, ctnr){
      var k, $j;
      if (typeof(ctnr.callback) === 'function') {
        $j = typeof(mixed) === 'number' ? this._jObject(mixed) : mixed;
        ctnr.callback.apply($j, [result]);
      } else if (typeof(ctnr.callback) === 'object') {
        for(k in ctnr.callback){
          if (!$j) $j = typeof(mixed) === 'number' ? this._jObject(mixed) : mixed;
          if (typeof(ctnr.callback[k]) === 'function') ctnr.callback[k].apply($j, [result]);
        }
      }
    },
    
    /**
     * @desc execute end functions 
     **/
    _manageEnd: function(id, sender, data, internal){
      var k, c;
      if (sender && (typeof(sender) === 'object')){
        this._attachEvents(id, sender, data);
        for(k in data.apply){
          c = data.apply[k];
          if(!c.action) continue;
          if (typeof(sender[c.action]) !== 'function') { 
            continue;
          }
          if (c.args) {
            sender[c.action].apply(sender, c.args);
          } else {
            sender[c.action]();
          }
        }
      }
      if (!internal) {
        this._callback(id, sender, data);
        this._end(id);
      }
    },
    
    /**
     * @desc return true if mixed is usable as number
     **/
    _isNumeric: function (mixed){
      return (typeof(mixed) === 'number' || typeof(mixed) === 'string') && mixed !== '' && !isNaN(mixed);
    },
    
    /**
     *  @desc convert mixed [ lat, lng ] objet by google.maps.LatLng
     **/
    _latLng: function(mixed, emptyReturnMixed, noFlat){
      var k, latLng={}, i=0,
          empty = emptyReturnMixed ? mixed : null;
      if (!mixed || (typeof(mixed) === 'string')){
        return empty;
      }
      if (mixed.latLng) {
        return this._latLng(mixed.latLng);
      }
      if (typeof(mixed.lat) === 'function') {
        return mixed;
      } else if ( this._isNumeric(mixed.lat) ) {
        return new google.maps.LatLng(mixed.lat, mixed.lng);
      } else if ( !noFlat ){
        for(k in mixed){
          if ( !this._isNumeric(mixed[k]) ) return empty;
          latLng[i?'lng':'lat'] = mixed[k];
          if (i) break;
          i++;
        }
        if (i) return new google.maps.LatLng(latLng.lat, latLng.lng);
      }
      return empty;
    },
    
    _count: function(mixed){
      var k, c = 0;
      for(k in mixed) c++;
      return c;
    },
    
    /**
     * @desc convert mixed [ sw, ne ] object by google.maps.LatLngBounds
     **/
    _latLngBounds: function(mixed, flatAllowed, emptyReturnMixed){
      var empty, cnt, ne, sw, k, t, ok, nesw, i;
      if (!mixed) return null;
      empty = emptyReturnMixed ? mixed : null;
      if (typeof(mixed.getCenter) === 'function') {
        return mixed;
      }
      cnt = this._count(mixed);
      if (cnt == 2){
        if (mixed.ne && mixed.sw){
          ne = this._latLng(mixed.ne);
          sw = this._latLng(mixed.sw);
        } else {
          for(k in mixed){
            if (!ne) {
              ne = this._latLng(mixed[k]);
            } else {
              sw = this._latLng(mixed[k]);
            }
          }
        }
        if (sw && ne) return new google.maps.LatLngBounds(sw, ne);
        return empty;
      } else if (cnt == 4){
        t = ['n', 'e', 's', 'w'];
        ok=true;
        for(i in t) ok &= this._isNumeric(mixed[t[i]]);
        if (ok) return new google.maps.LatLngBounds(this._latLng([mixed.s, mixed.w]), this._latLng([mixed.n, mixed.e]));
        if (flatAllowed){
          i=0;
          nesw={};
          for(k in mixed){
            if (!this._isNumeric(mixed[k])) return empty;
            nesw[t[i]] = mixed[k];
            i++;
          }
          return new google.maps.LatLngBounds(this._latLng([nesw.s, nesw.w]), this._latLng([nesw.n, nesw.e]));
        }
      }
      return empty;
    },
    
    /**
     * @desc search an (insensitive) key
     **/
    _ikey: function(object, key){
      key = key.toLowerCase();
      for(var k in object){
        if (k.toLowerCase() == key) return k;
      }
      return false;
    },
    
    /**
     * @desc search an (insensitive) key
     **/
    _ival: function(object, key){
      var k = this._ikey(object, key);
      if ( k ) return object[k];
      return null;
    },
    
    /**
     * @desc return true if at least one key is set in object
     * nb: keys in lowercase
     **/
    _hasKey: function(object, keys){
      var n, k;
      if (!object || !keys) return false;
      for(n in object){
        n = n.toLowerCase();
        for(k in keys){
          if (n == keys[k]) return true;
        }
      }
      return false;
    },
    
    /**
     * @desc return a standard object
     * nb: include in lowercase
     **/
    _extractObject: function(data, include){
      if (this._hasKey(data, this._properties) || this._hasKey(data, include)){
        var k, p, ip, r={};
        for(k in this._properties){
          p=this._properties[k];
          ip = this._ikey(data, p);
          r[p] = ip ? data[ip] : {};
        }
        for(k in include){
          p=include [k];
          ip = this._ikey(data, p);
          if (ip) r[p] = data[ip];
        }
        return r;
      } else {
        r = { options : {} };
        for(k in data){
          if (k == 'action') continue;
          r.options[k] = data[k];
        }
        return r;
      }
    },
    
    /**
     * @desc identify object from object list or parameters list : [ objectName:{data} ] or [ otherObject:{}, ] or [ object properties ]
     * nb: include, exclude in lowercase
     **/
    _object: function(name, data, include, exclude){
      var k = this._ikey(data, name),
          p, r = {}, keys=['map'];
      if (k) return this._extractObject(data[k], include);
      for(k in exclude) keys.push(exclude[k]);
      if (!this._hasKey(data, keys)) r = this._extractObject(data, include);
      for(k in this._properties){
        p=this._properties[k];
        if (!r[p]) r[p] = {};
      }
      return r;
    },
    
    /**
     * @desc Returns the geographical coordinates from an address and call internal method
     **/
    _resolveLatLng: function(id, data, method, all){
      var address = this._ival(data, 'address'),
          region, params,
          that = this, cb;
      if ( address ){
          cb = function(results, status) {
          if (status == google.maps.GeocoderStatus.OK){
            that[method](id, data, all ? results : results[0].geometry.location);
          } else {
            if (that._default.verbose){
              alert('Geocode error : ' + status);
            }
            that[method](id, data, false);
          }
        };
        if (typeof(address) === 'object'){
          params = address;
        } else {
          params = { 'address': address };
          region = this._ival(data, 'region');
          if (region){
            params.region = region;
          }
        }
        this._getGeocoder().geocode( params, cb );
      } else {
        this[method](id, data, this._latLng(data, false, true));
      }
    },
    
    /*============================*/
    /*          PUBLIC            */
    /*============================*/
    
    /**
     * @desc Destroy an existing instance
     **/
    destroy: function(id, data){
      var k, $j;
      if (this._ids[id]){
        this._clear(id);
        this._ids[id].$this.empty();
        if (this._ids[id].bl) delete this._ids[id].bl;
        for(k in this._ids[id].styles){
          delete this._ids[id].styles[ k ];
        }
        delete this._ids[id].map;
        $j = this._jObject(id);
        delete this._ids[id];
        this._callback($j, null, data);
      }
      this._end(id);
    },
    
    /**
     * @desc Initialize google map object an attach it to the dom element (using id)
     **/
    init: function(id, data, internal){
      var o, opts, map, styles, k, $this;
      if ( (id == '') || (this._exist(id)) ) return this._end(id);
      o = this._object('map', data);
      if ( (typeof(o.options.center) === 'boolean') && o.options.center) {
        return false; // wait for an address resolution
      }
      opts = $.extend({}, this._default.init, o.options);
      if (!opts.center) {
        opts.center = [this._default.init.center.lat, this._default.init.center.lng];
      }
      opts.center = this._latLng(opts.center);
      $this = this._jObject(id);
      this._setMap(id, new google.maps.Map($this.get(0), opts));
      map = this._getMap(id);
      
      // add previous added styles
      styles = this._getStyles( id );
      for(k in styles) map.mapTypes.set(k, styles[k]);
      
      this._manageEnd(id, map, o, internal);
      return true;
    },
    
    /**
     * @desc Returns the geographical coordinates from an address
     **/
    getlatlng: function(id, data){
      this._resolveLatLng(id, data, '_getLatLng', true);
    },
    _getLatLng: function(id, data, results){
      this._manageEnd(id, results, data);
    },
    
    /**
     * @desc Return address from latlng        
     **/
    getaddress: function(id, data){
      var callback,
          $this = this._jObject(id),
          latLng = this._latLng(data, false, true),
          cb = this._ival(data, 'callback');
      if (latLng && cb && typeof(cb) === 'function') {
        callback = function(results, status) {
          var out = status == google.maps.GeocoderStatus.OK ? results : false;
          cb.apply($this, [out, status]);
        };
        this._getGeocoder().geocode({'latLng': latLng}, callback);
      }
      this._end(id);
    },
    
    /**
     * @desc Return a route
     **/
    getroute: function(id, data){
      var callback,
          $this = this._jObject(id),
          cb = this._ival(data, 'callback');
      if ( (typeof(cb) === 'function') && data.options ) {
        data.options.origin = this._latLng(data.options.origin, true);
        data.options.destination = this._latLng(data.options.destination, true);
        callback = function(results, status) {
          var out = status == google.maps.DirectionsStatus.OK ? results : false;
          cb.apply($this, [out, status]);
        };
        this._getDirectionsService().route( data.options, callback );
      }
      this._end(id);
    },
    /**
     *  @desc return elevation
     **/
    getelevation: function(id, data){
      var callback, latLng, ls, k, path, samples,
          locations = [],
          $this = this._jObject(id),
          cb = this._ival(data, 'callback'),
          latLng = this._ival(data, 'latlng');
      if (cb && typeof(cb) === 'function') {
        callback = function(results, status) {
          var out = status == google.maps.ElevationStatus.OK ? results : false;
          cb.apply($this, [out, status]);
        };
        if (latLng){
          locations.push( this._latLng(latLng) );
        } else {
          ls = this._ival(data, 'locations');
          if (ls){
            for(k in ls){
              locations.push( this._latLng(ls[k]) );
            }
          }
        }
        if (locations.length){
          this._getElevationService().getElevationForLocations({locations:locations}, callback);
        } else {
          path = this._ival(data, 'path');
          samples = this._ival(data, 'samples');
          if (path && samples){
            for(k in path){
              locations.push(this._latLng(path[k]));
            }
            if (locations.length){
              this._getElevationService().getElevationAlongPath( {path:locations, samples:samples}, callback );
            }
          }
        }
      }
      this._end(id);
    },
    
    /**
     * @desc Add a marker to a map after address resolution
     * if [infowindow] add an infowindow attached to the marker   
     **/
    addmarker: function(id, data){
      this._resolveLatLng(id, data, '_addMarker');
    },
    
    _addMarker: function(id, data, latLng, internal){
      var mk, oi, to,
          n = 'marker', niw = 'infowindow',
          o = this._object(n, data, ['to']);
      if (!internal){
        if (!latLng) {
          this._manageEnd(id, false, o);
          return;
        }
        this._subcall(id, data, latLng);
      } else if (!latLng){
        return;
      }
      if (o.to){
        to = this._getStoredId(id, o.to);
        mk = to && (typeof(to.add) === 'function');
        if (mk){
          to.add(latLng, data);
          if (typeof(to.redraw) === 'function'){
            to.redraw();
          }
        }
        if (!internal){
          this._manageEnd(id, mk, o);
        }
      } else {
        o.options.position = latLng;
        o.options.map = this._getMap(id);
        mk = new google.maps.Marker(o.options);
        if ( data[niw] ){
          oi = this._object(niw, data[niw], ['open']);
          if ( (oi['open'] === undefined) || oi['open'] ) {
            oi.apply = this._array(oi.apply);
            oi.apply.unshift({action:'open', args:[this._getMap(id), mk]});
          }
          oi.action = 'add'+niw;
          this._planNext(id, oi); 
        }
        if (!internal){
          this._store(id, n, mk);
          this._manageEnd(id, mk, o);
        }
      }
      return mk;
    },
    
    /**
     * @desc Add markers (without address resolution)
     **/
    addmarkers: function(id, data){
      if (this._ival(data, 'clusters') !== null){
        this._addclusteredmarkers(id, data);
      } else {
        this._addmarkers(id, data);
      }
    },
    _addmarkers: function(id, data){
      var o, k, latLng, marker, markers = [], 
          n = 'marker',
          markers = this._ival(data, 'markers');
      this._subcall(id, data);
      if (!markers && (this._default.retro === 2)){
        markers = this._ival(data, 'latlng');
      }
      if ( !markers || (typeof(markers) !== 'object') ) {
        return this._end(id);
      }
      o = this._object(n, data, ['to']);
      
      if (o.to){
        to = this._getStoredId(id, o.to);
        mk = to && (typeof(to.add) === 'function');
        if (mk){
          for(k in markers){
            latLng = this._latLng(markers[k]);
            if (!latLng) continue;
            to.add(latLng, markers[k]);
          }
          if (typeof(to.redraw) === 'function'){
            to.redraw();
          }
        }
        this._manageEnd(id, mk, o);
      } else {
        o.options.map = this._getMap(id);
        for(k in markers){
          latLng = this._latLng(markers[k]);
          if (!latLng) continue;
          o.options.position = latLng;
          marker = new google.maps.Marker(o.options);
          markers.push(marker);
          o.data = markers[k].data;
          this._store(id, n, marker);
          this._manageEnd(id, marker, o, true);
        }
        this._callback(id, markers, data);
        this._end(id);
      }
    },
    
    getscale: function(id, data, internal){
      var map = this._getMap(id),
          zoom = map.getZoom(),
          scales = [
            77.864462034120315,
            45.42785688110077,
            16.220730575856892,
            6.879509682822463,
            3.5034960477802986,
            1.8034610362879133,
            0.9127181102723314,
            0.4598746767146186,
            0.23053567913908648,
            0.11545247438886701,
            0.05775371939320953,
            0.02881647975962874,
            0.014414070716531697,
            0.007207618499622224,
            0.003603886381819732,
            0.0018015948787526637,
            0.0009008246767800296,
            0.0004504160086085826,
            0.00022520761796505934,
            0.00011260535432642145,
            0.00005630113180858676
          ];
      scale = scales[zoom];
      if (!internal){
        this._callback(id, scale, data);
        this._end(id);
      }
      return scale;
    },
    _addclusteredmarkers:function(id, data){
      var clusterer, k, latLng, clusters, storeId,
          that = this,
          radius = this._ival(data, 'radius'),
          markers = this._ival(data, 'markers'),
          styles = this._ival(data, 'clusters'),
          scale = this.getscale(id, null, true),
          bounds = this._getMap(id).getBounds();
          
      if (!bounds){ // map not initialised => bounds not available
        // wait for map
        google.maps.event.addListenerOnce(
          this._getMap(id), 
          'bounds_changed', 
          function() {
            that._addclusteredmarkers(id, data);
          }
        );
        return;
      }
      
      if (typeof(radius) === 'number'){
        clusterer = new Clusterer();
        for (k in markers){
          latLng = this._latLng(markers[k]);
          clusterer.add(latLng, markers[k]);
        }
        storeId = this._initClusters(id, data, clusterer, radius, scale, bounds, styles);
      }
      
      this._callback(id, storeId, data);
      this._end(id);
    },
    
    _initClusters: function(id, data, clusterer, radius, scale, bounds, styles){
      var that=this, 
          map = this._getMap(id),
          currents = clusterer.clusters(radius*scale, bounds);
          
      clusterer.setRedraw(function(){
        var tmp;
        scale=that.getscale(id, null, true);
        tmp = clusterer.clusters(radius*scale, map.getBounds(), currents, true);
        if (!tmp.updated){
          return;
        }
        clusterer.freeDom();
        currents = tmp;
        that._displayClusters(id, data, clusterer, currents, styles);
      });

      this._displayClusters(id, data, clusterer, currents, styles);
      
      clusterer.events(
        google.maps.event.addListener(
          map, 
          'zoom_changed',
          function() {
            clusterer.redraw();
          }
        ),
        google.maps.event.addListener(
          map, 
          'dragend',
          function() {
              scale=that.getscale(id, null, true);
              currents = clusterer.clusters(radius*scale, map.getBounds(), currents, false);
              clusterer.freeDom();
              that._displayClusters(id, data, clusterer, currents, styles);
            }
          )
        );
        return this._store(id, 'cluster', clusterer);
    },
    
    _displayClusters: function(id, data, clusterer, currents, styles){
      var c, k, i, m, done, md, mk, ov, cl;
      for(c in currents.clusters){
        cl = currents.clusters[c];
        done = false;
        if (cl.idx.length > 1){
          m = 0;
          for(k in styles){
            if ( (k > m) && (k <= cl.idx.length) ){
              m = k;
            }
          }
          if (styles[m]){
            ov = {
              content:styles[m].content.replace('CLUSTER_COUNT', cl.idx.length),
              offset:{
                x: -this._ival(styles[m], 'width')/2,
                y: -this._ival(styles[m], 'height')/2
              }
            };
            clusterer.store(this._addOverlay(id, ov, this._latLng(cl)));
            done = true;
          }
        }
        if (!done){
          cl.dom = [];
          for(i in cl.idx){
            md = clusterer.get(cl.idx[i]);
            if (latLng = this._latLng(md)){
              mk = this._addMarker(id, md, latLng, true);
              data.data = md[2].data;
              this._attachEvents(id, mk, data);
              clusterer.store(mk);
            }
          }
        }
      }
    },
    
    /**
     * @desc Add an infowindow after address resolution
     **/
    addinfowindow: function(id, data){ 
      this._resolveLatLng(id, data, '_addInfoWindow');
    },
    _addInfoWindow: function(id, data, latLng){
      var o, infowindow, args = [],
          n = 'infowindow';
      this._subcall(id, data, latLng);
      o = this._object(n, data, ['open', 'anchor']);
      if (latLng) {
        o.options.position = latLng;
      }
      infowindow = new google.maps.InfoWindow(o.options);
      if ( (o.open === undefined) || o.open ){
        o.apply = this._array(o.apply);
        args.push(this._getMap(id));
        if (o.anchor){
          args.push(o.anchor);
        }
        o.apply.unshift({action:'open', args:args});
      }
      this._store(id, n, infowindow);
      this._manageEnd(id, infowindow, o);
    },
    
    /**
     * @desc add a polygone / polylin on a map
     **/
    addpolyline: function(id, data){
      this._addPoly(id, data, 'Polyline', 'path');
    },
    addpolygon: function(id, data){
      this._addPoly(id, data, 'Polygon', 'paths');
    },
    _addPoly: function(id, data, poly, path){
      var k, i, obj, o = this._object(poly.toLowerCase(), data, [path]);
      if (o[path]){
        o.options[path] = [];
        i = 0; 
        for(k in o[path]){
          o.options[path][i++] = this._latLng(o[path][k]);
        }
      }
      obj = new google.maps[poly](o.options);
      obj.setMap(this._getMap(id));
      this._store(id, poly.toLowerCase(), obj);
      this._manageEnd(id, obj, o);
    },
    
    /**
     * @desc add a circle   
     **/
    addcircle: function(id, data){
      this._resolveLatLng(id, data, '_addCircle');
    },
    _addCircle: function(id, data, latLng ){
      var c, n = 'circle',
          o = this._object(n, data);
      if (!latLng) latLng = this._latLng(o.options.center);
      if (!latLng) return this._manageEnd(id, false, o);
      this._subcall(id, data, latLng);
      o.options.center = latLng;
      o.options.map = this._getMap(id);
      c = new google.maps.Circle(o.options);
      this._store(id, n, c);
      this._manageEnd(id, c, o);
    },
    
    /**
     * @desc add a rectangle   
     **/
    addrectangle: function(id, data){
      this._resolveLatLng(id, data, '_addRectangle');
    },
    _addRectangle: function(id, data, latLng ){
      var r, n = 'rectangle',
          o = this._object(n, data);
      o.options.bounds = this._latLngBounds(o.options.bounds, true);
      if (!o.options.bounds) return this._manageEnd(id, false, o);
      this._subcall(id, data, o.options.bounds.getCenter());
      o.options.map = this._getMap(id);
      r = new google.maps.Rectangle(o.options);
      this._store(id, n, r);
      this._manageEnd(id, r, o);
    },
    
    /**
     * @desc add an overlay to a map after address resolution
     **/
    addoverlay: function(id, data){
      this._resolveLatLng(id, data, '_addOverlay');
    },
    _addOverlay: function(id, data, latLng, internal){
      var ov,  
          o = this._object('overlay', data),
          opts =  $.extend({
                    pane: 'floatPane',
                    content: '',
                    offset:{
                      x:0,y:0
                    }
                  },
                  o.options);
      f.prototype = new google.maps.OverlayView();
      
      function f(opts, latLng, map) {
        this.opts_ = opts;
        this.$div_ = null;
        this.latLng_ = latLng;
        this.map_ = map;
        this.setMap(map);
      }
      f.prototype.onAdd = function() {
        var panes,
            $div = $('<div></div>');
        $div
          .css('border', 'none')
          .css('borderWidth', '0px')
          .css('position', 'absolute');
        $div.append($(this.opts_.content));
        this.$div_ = $div;
        panes = this.getPanes();
        if (panes[this.opts_.pane]) $(panes[this.opts_.pane]).append(this.$div_);
      }
      f.prototype.draw = function() {
        if (!this.$div_) return;
        var ps, overlayProjection = this.getProjection();
        ps = overlayProjection.fromLatLngToDivPixel(this.latLng_);
        this.$div_
          .css('left', (ps.x+this.opts_.offset.x) + 'px')
          .css('top' , (ps.y+this.opts_.offset.y) + 'px');
      }
      f.prototype.onRemove = function() {
        this.$div_.remove();
        this.$div_ = null;
      }
      f.prototype.hide = function() {
        if (this.$div_) this.$div_.hide();
      }
      f.prototype.show = function() {
        if (this.$div_) this.$div_.show();
      }
      f.prototype.toggle = function() {
        if (this.$div_) {
          if (this.$div_.is(':visible')){
            this.show();
          } else {
            this.hide();
          }
        }
      }
      f.prototype.toggleDOM = function() {
        if (!this.$div_) return;
        if (this.getMap()) {
          this.setMap(null);
        } else {
          this.setMap(this.map_);
        }
      }
      ov = new f(opts, latLng, this._getMap(id));
      if (!internal){
        this._store(id, 'overlay', ov);
        this._manageEnd(id, ov, o);
      }
      return ov;
    },
    
    /**
     * @desc add fixed panel to a map
     **/
    addfixpanel: function(id, data){
      var n = 'fixpanel',
          o = this._object(n, data),
          x=0, y=0, $c, $div;
      if (o.options.content){
        $c = $(o.options.content);
        
        if (o.options.left !== undefined){
          x = o.options.left;
        } else if (o.options.right !== undefined){
          x = this._jObject(id).width() - $c.width() - o.options.right;
        } else if (o.options.center){
          x = (this._jObject(id).width() - $c.width()) / 2;
        }
        
        if (o.options.top !== undefined){
          y = o.options.top;
        } else if (o.options.bottom !== undefined){
          y = this._jObject(id).height() - $c.height() - o.options.bottom;
        } else if (o.options.middle){
          y = (this._jObject(id).height() - $c.height()) / 2
        }
      
        $div = $('<div></div>')
                .css('position', 'absolute')
                .css('top', y+'px')
                .css('left', x+'px')
                .css('z-index', '1000')
                .append(o.options.content);
        
        this._jObject(id).first().prepend($div);
        this._attachEvents(id, this._getMap(id), o);
        this._store(id, n, $div);
        this._callback(id, $div, o);
      }
      this._end(id);
    },
    
    /**
     * @desc Remove a direction renderer
     * deprecated   
     **/
    removedirectionsrenderer: function(id, data, internal){
      var o = this._object('directionrenderer', data);
      this._clear(id, 'directionrenderer');
      this._manageEnd(id, true, o, internal);
    },
    
    /**
     * @desc Add a direction renderer to a map
     **/
    adddirectionsrenderer: function(id, data, internal){
      var n = 'directionrenderer',
          dr, o = this._object(n, data, ['panelId']);
      this._clear(id, n);
      o.options.map = this._getMap(id);
      dr = new google.maps.DirectionsRenderer(o.options);
      if (o.panelId) {
        dr.setPanel(document.getElementById(o.panelId));
      }
      this._store(id, n, dr);
      this._manageEnd(id, dr, o, internal);
    },
    
    /**
     * @desc Set direction panel to a dom element from it ID
     **/
    setdirectionspanel: function(id, data){
      var dr, o = this._object('directionpanel', data, ['id']);
      if (o.id) {
        dr = this._getDirectionRenderer(id);
        dr.setPanel(document.getElementById(o.id));
      }
      this._manageEnd(id, dr, o);
    },
    
    /**
     * @desc Set directions on a map (create Direction Renderer if needed)
     **/
    setdirections: function(id, data){
      var dr, o = this._object('directions', data);
      if (data) o.options.directions = data.directions ? data.directions : (data.options && data.options.directions ? data.options.directions : null);
      if (o.options.directions) {
        dr = this._getDirectionRenderer(id);
        if (!dr) {
          this.adddirectionsrenderer(id, o, true);
          dr = this._getDirectionRenderer(id);
        } else {
          dr.setDirections(o.options.directions);
        }
      }
      this._manageEnd(id, dr, o);
    },
    
    /**
     * @desc set a streetview to a map
     **/
    setstreetview: function(id, data){
      var o = this._object('streetview', data, ['id']),
          panorama;
      if (o.options.position){
        o.options.position = this._latLng(o.options.position);
      }
      panorama = new google.maps.StreetViewPanorama(document.getElementById(o.id),o.options);
      this._getMap(id).setStreetView(panorama);
      this._manageEnd(id, panorama, o);
    },
    
    /**
     * @desc add a kml layer to a map
     **/
    addkmllayer: function(id, data){
      var kml, o = this._object('kmllayer', data, ['url']);
      o.options.map = this._getMap(id);
      kml = new google.maps.KmlLayer(o.url, o.options);
      this._manageEnd(id, kml, data);
    },
    
    /**
     * @desc add a traffic layer to a map
     **/
    addtrafficlayer: function(id, data){
      var n = 'trafficlayer', 
          o = this._object(n),
          tl = this._getFirstStored(id, n);
      if (!tl){
        tl = new google.maps.TrafficLayer();
        tl.setMap(this._getMap(id));
        this._store(id, n, tl);
      }
      this._manageEnd(id, tl, o);
    },
    
    /**
     * @desc remove a traffic layer from a map
     * deprecated   
     **/
    removetrafficlayer: function(id, data){
      var n = 'trafficlayer',
          o = this._object(n),
          tl = this._getFirstStored(id, n),
          r = tl ? true : false;
      if (tl) this._clear(id, n);
      this._manageEnd(id, r, o);
    },
    
    /**
     * @desc set a bicycling layer to a map
     **/
    addbicyclinglayer: function(id, data){
      var n = 'bicyclinglayer',
          o = this._object(n),
          bl = this._getFirstStored(id, n);
      if (!bl){
        bl = new google.maps.BicyclingLayer();
        bl.setMap(this._getMap(id));
        this._store(id, n, bl);
      }
      this._manageEnd(id, bl, o);
    },
    
    /**
     * @desc remove a bicycling layer from a map
     * deprecated   
     **/
    removebicyclinglayer: function(id, data){
      var n = 'bicyclinglayer',
          o = this._object(n),
          bl = this._getFirstStored(id, n),
          r = bl ? true : false;
      if (bl) this._clear(id, n);
      this._manageEnd(id, r, o);
    },
    
    
    /**
     * @desc add a ground overlay to a map
     **/
    addgroundoverlay: function(id, data){
      var n = 'groundoverlay',
          o = this._object(n, data, ['bounds', 'url']),
          ov;
      o.bounds = this._latLngBounds(o.bounds);
      if (o.bounds && o.url){
        ov = new google.maps.GroundOverlay(o.url, o.bounds);
        ov.setMap(this._getMap(id));
        this._store(id, n, ov);
      }
      this._manageEnd(id, ov, o);
    },
    
    /**
     * @desc Geolocalise the user and return a LatLng
     **/
    geolatlng: function(id, data){
      var geo,
          cb = this._ival(data, 'callback'),
          $this = this._jObject(id);
      if (typeof(cb) === 'function') {
        if(navigator.geolocation) {
          browserSupportFlag = true;
          navigator.geolocation.getCurrentPosition(function(position) {
            var out = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);
            cb.apply($this, [out]);
          }, function() {
            var out = false;
            cb.apply($this, [out]);
          });
        } else if (google.gears) {
          browserSupportFlag = true;
          geo = google.gears.factory.create('beta.geolocation');
          geo.getCurrentPosition(function(position) {
            var out = new google.maps.LatLng(position.latitude,position.longitude);
            cb.apply($this, [out]);
          }, function() {
            out = false;
            cb.apply($this, [out]);
          });
        } else {
            out = false;
            cb.apply($this, [out]);
        }
      }
      this._end(id);
    },
    
    /**
     * @desc Add a style to a map
     **/
    addstyledmap: function(id, data, internal){
      var o = this._object('styledmap', data, ['id', 'style']),
          style;
      if  (o.style && o.id && !this._styleExist(id, o.id)) {
        style = new google.maps.StyledMapType(o.style, o.options);
        this._addStyle(id, o.id, style);
        if (this._getMap(id)) this._getMap(id).mapTypes.set(o.id, style);
      }
      this._manageEnd(id, style, o, internal);
    },
    
    /**
     * @desc Set a style to a map (add it if needed)
     **/
    setstyledmap: function(id, data){
      var o = this._object('styledmap', data, ['id', 'style']),
          style;
      if (o.id) {
        this.addstyledmap(id, o, true);
        style = this._getStyle(id, o.id);
        if (style) {
          this._getMap(id).setMapTypeId(o.id);
          this._callback(id, style, data);
        }
      }
      this._manageEnd(id, style, o);
    },
    
    /**
     * @desc Remove objects from a map
     **/
    clear: function(id, data){
      var list = this._array(data.list),
          last = data.last ? true : false,
          first = data.first ? true : false;
      this._clear(id, list, last, first);
      this._end(id);
    },
    
    /**
     * @desc Return Google object(s) wanted
     **/
    get: function(id, data){
      var name = this._ival(data, 'name') || 'map',
          first= this._ival(data, 'first'),
          all  = this._ival(data, 'all'),
          r, k;
      name = name.toLowerCase();
      if (name == 'map'){
        return this._getMap(id);
      }
      if (first){
        return this._getFirstStored(id, name);
      } else if (all){
        r = new Array();
        if (this._ids[id].stored[name]){
          for(k in this._ids[id].stored[name]){
            if (this._ids[id].stored[name][k]){
              r.push(this._ids[id].stored[name][k]);
            }
          }
        }
        return r;
      } else {
        return this._getLastStored(id, name);
      }
    },
    
    /**
     * @desc return the radius of the earth depending on the unit
     **/
    earthradius: function(unit){
      unit = unit ? unit : this._default.unit;
      return (typeof(unit) === 'string' && (unit.toLowerCase() === 'km')) ? 6371 : 3959;
    },
    
    /**
     * @desc the distance between 2 latLng depending on the unit
     **/
    distance: function(id, data){
      var unit = this._ival(data, 'unit'),
          a = this._latLng(this._ival(data, 'a')),
          b = this._latLng(this._ival(data, 'b')),
          e,f,g,h, dist;
      if (a && b){
        e=(Math.PI*a.lat()/180);
        f=(Math.PI*a.lng()/180);
        g=(Math.PI*b.lat()/180);
        h=(Math.PI*b.lng()/180);
        dist = this.earthradius(unit)*Math.acos(Math.min(Math.cos(e)*Math.cos(g)*Math.cos(f)*Math.cos(h)+Math.cos(e)*Math.sin(f)*Math.cos(g)*Math.sin(h)+Math.sin(e)*Math.sin(g),1)); 
      }
      return dist;
    },
    
    /**
     * @desc return the max zoom of a latlng
     **/
    getmaxzoom: function(id, data){
      this._resolveLatLng(id, data, '_getMaxZoom');
    },
    _getMaxZoom: function(id, data, latLng){
      var callback,
          $this = this._jObject(id), 
          cb = this._ival(data, 'callback');
      if (cb && typeof(cb) === 'function') {
        callback = function(result) {
          var zoom = result.status == google.maps.MaxZoomStatus.OK ? result.zoom : false;
          cb.apply($this, [zoom, result.status]);
        };
        this._getMaxZoomService().getMaxZoomAtLatLng(latLng, callback);
      }
      this._end(id);
    },
  
  /**
   * @desc modify default values
   **/
    setdefault: function(id, data, internal){
      for(var k in data){
        if (typeof(this._default[k]) === 'object'){
          this._default[k] = jQuery.extend({}, this._default[k], data[k]);
        } else {
          this._default[k] = data[k];
        }
      }
      if (!internal){
        this._end(id);
      }
    }
  };
  
  var globalId = 0;
  
  $.fn.gmap3 = function(){
    var a,i,
        todo = [],
        results = [],
        empty = true;
    for(i=0; i<arguments.length; i++){
      a = arguments[i] || {};
      if (typeof(a) === 'string'){
        a = {action:a};
      }
      if (a.action && (a.action.substr(0, 1) == ':')){
        a.action = a.action.substr(1);
      }
      todo.push(a);
    }
    if (!todo.length) todo.push({});
    $.each(this, function() {
      var id;
        $this = $(this),
        id = $this.data('id');
      empty = false;
      if (!id){
        id = ++globalId;
        $this.data('id', id);
      }
      if (todo.length == 1){
        if (gmap3._isDirect(id, todo[0])){
          results.push(gmap3._direct(id, todo[0]));
        } else {
          res = gmap3._plan($this, id, todo);
          if (res){ // value returned in [] by _proceed => return current
            for(i in res){
              results.push(res[i]);
            }
          }
        }
      } else {
        gmap3._plan($this, id, todo);
      }
    });
    if (results.length){
      if (results.length === 1){ // 1 css selector
        return results[0];
      } else {
        return results;
      }
    }
    if (empty && (arguments.length == 2) && (typeof(arguments[0]) === 'string') && (arguments[0].toLowerCase() === 'setdefault')){
      gmap3.setdefault(0, arguments[1], true);
    }
    return this;
  }

}(jQuery));