
var DoublePlayer = function(conf){
    if (conf){
        this.log = conf.log;
        this.container = conf.container;        
    }
    
    this.currentTime = 0;
    this.timer;
    this.isPlay1 = true;
    this.ended = false;
    this.video1 = this.createVideo();
    this.video2 = this.createVideo();
    this.scene = this.createScene();
};

DoublePlayer.prototype.isPC = (function(){
    var userAgentInfo = navigator.userAgent;
    var Agents = ["Android", "iPhone",
                "SymbianOS", "Windows Phone",
                "iPad", "iPod"];
    var flag = true;
    for (var v = 0; v < Agents.length; v++) {
        if (userAgentInfo.indexOf(Agents[v]) > 0) {
            flag = false;
            break;
        }
    }
    return flag;
})();


DoublePlayer.prototype.createVideo = function(){
    var v = document.createElement( 'video' );
    var switchDelay = 0.5;
    v.height = 80;
    v.loop = false;
    v.autoplay = true;
    //v.controls = "controls";
    //v.src = src;
    v.setAttribute( 'webkit-playsinline', '' );
    v.setAttribute( 'playsinline', '' );
    $e("top").appendChild(v);
    v.pause(); //for pc
    var self = this;

    //is it necessary? yes
    v.addEventListener("timeupdate", function(){
        if (this.currentTime > self.currentTime){
            //it never go back
            self.currentTime = this.currentTime;    
        }
        else{
            //v.currentTime = currentTime + switchDelay;
        }        
    });
    v.addEventListener("loadedmetadata", function(){
        //when a video is loaded, it might be a view switching one. 
        //need to seek to the current point.
        //log("loadedmetadata:" + self.currentTime);
        if (self.currentTime > 0){
            this.currentTime = self.currentTime + switchDelay;
        }
        //if (isSwitching)
            
    });

    v.addEventListener("ended", function(){
        self.log("ended");
        self.ended = true;
    });
   
    //If no seeked is callback, then it will be a bug.
    v.addEventListener("seeked", function(){
        if (v.paused){
            v.play(); 
        }
    });
    
    v.addEventListener("playing", function(){
        if (self.isSwitching){
            self.isSwitching = false;
            switchDelay = (Date.now() - self.timer)/1000.0 + 0.2; //为了无缝拼接加一个时间
            self.log("Switched success! Cost " + switchDelay.toFixed(2));
            //There are many ways to switch the image:
            //1.Change the material of the mesh
            //2.Create two different meshes and display one at a time
            //3.Add and remove the meshes 
            //4.Create a new mesh everytime and remove the old one
            //On android chrome every way is ok. But on ios only the last one works ok.
            if (self.mesh1.visible){
                self.mesh1.visible = false;
                self.mesh2.visible = true;
                self.scene.remove(self.mesh1);
                self.scene.add( self.mesh2 );
            }
            else{
                self.mesh1.visible = true;
                self.mesh2.visible = false;
                self.scene.remove(self.mesh2);
                self.scene.add( self.mesh1 );
            }

            // self.mesh1.visible = !self.mesh1.visible;
            // self.mesh2.visible = !self.mesh2.visible; 

            //即使seek到固定时间，但新视频第一次渲染还是会取到视频的第一帧画面
            //material.map = curTT; 

            //用这种方法切换素材在iphone下会先出现第一帧画面，再回到当前画面，有待解决
            // theMesh.material = new THREE.MeshBasicMaterial( { map: curTT, side: THREE.DoubleSide, shading: THREE.FlatShading, wireframe: false } );
            

            // var tmpgeometry = new THREE.SphereBufferGeometry( 500, 60, 60 );//半径，水平分片，垂直分片
            // tmpgeometry.scale( - 1, 1, 1 );
            
            // var tmpmaterial   = new THREE.MeshBasicMaterial( { map : curTT } );
            // var tmpmesh = new THREE.Mesh( tmpgeometry, tmpmaterial );
            // scene.remove(lastMesh);
            // scene.add( tmpmesh );

            // lastMesh = tmpmesh;
            //material.map = curTT;    

            //clear the old video src to stop the loading
            if(v == self.video1){
                self.video2.src = "";
            }
            else{
                self.video1.src = "";
            }

            setTimeout(function(){
                                           
            }, 0);
            
        }      
    });

    return v;
}


DoublePlayer.prototype.startPlay = function(src){
    //trigger both videos to play
    this.video1.src = src;
    this.video1.play();
    this.video2.src = src;
    this.video2.play();
    var self = this;

    var playingHandler2 = function(e){
        log("2 videos activated");
        self.video1.play();
        self.video2.src = "";
        self.video2.removeEventListener("playing", playingHandler2);
    };

    this.video2.addEventListener("playing", playingHandler2);
}

DoublePlayer.prototype.switchVideo = function(src){
    if (this.ended){
        return false;
    }
    if(this.isSwitching){
        //last one is still switching
        return;
    }

    log("Start switch to another view");
    this.isSwitching = true;
    isSwitching = true;
    this.isPlay1 = !this.isPlay1;
    this.timer = Date.now();

    //important! This can keep the new video to load and keep the old one playing.
    //The new video will emit "loadedmetadata" event and trigger the switch
    if(this.isPlay1){                
        this.video1.src = src;
        this.video1.pause();
        //log("video2.src=" + this.video2.src);
        this.video2.play(); 
    }
    else{        
        this.video2.src = src;
        this.video2.pause();
        //log("video1.src=" + this.video1.src);
        this.video1.play();           
    }
}


DoublePlayer.prototype.createScene = function(){
    var camera = new THREE.PerspectiveCamera( 90, window.innerWidth / window.innerHeight, .1, 2000 );
    // the camera should be at 0, but the trackball controller doesn't
    // work in that case so offset it a tiny amount
    camera.position.z = 0.001;

    var scene = new THREE.Scene();
    var renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    this.container.appendChild( renderer.domElement );
    this.loadObject(scene);

    var controls = this.createControls(scene, camera, renderer);
    var stats = this.createStats();
    function update() {
        controls.update();
        stats.update();                
        renderer.render( scene, camera );
    }
    var self = this;

    function animate() {
        if (!self.ended){
            requestAnimationFrame( animate );
            update();
        }        
    }
    animate();

    if (this.isPC){
        window.addEventListener( 'resize', onWindowResize, false );
        function onWindowResize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize( window.innerWidth, window.innerHeight );
        }
    }
    return scene;
}

DoublePlayer.prototype.createControls = function(scene, camera, renderer){
    var controls = new THREE.TrackballControls( camera );
    controls.rotateSpeed = 1.0;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 0.8;
    controls.noZoom = true;
    controls.noPan = true;
    controls.staticMoving = true;
    controls.dynamicDampingFactor = 0.3;
    controls.keys = [ 65, 83, 68 ];
    controls.addEventListener( 'change', function(){
        renderer.render( scene, camera );
    } );
    return controls;
}

DoublePlayer.prototype.createStats = function(){
    var stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.bottom = '0px';
    stats.domElement.style.zIndex = 10;
    document.body.appendChild( stats.domElement );
    return stats;
}

DoublePlayer.prototype.loadObject = function(scene){
    var renderMeshFile = './trapezoid.obj';
    //var theMesh;
    var manager = new THREE.LoadingManager();
    var loader = new THREE.OBJLoader( manager );

    var self = this;
    loader.load(renderMeshFile, function ( object ) {
        object.traverse( function ( child ) {
            //there is one mesh and one group
            if ( child instanceof THREE.Mesh ) {
                self.mesh1 = child;
                
                var tt = new THREE.VideoTexture( self.video1 );
                tt.minFilter = THREE.LinearFilter;
                tt.format = THREE.RGBFormat;
                child.material = new THREE.MeshBasicMaterial( { map: tt, side: THREE.DoubleSide, shading: THREE.FlatShading, wireframe: false } );
                //child.visible = false;
            }
        } );

        //object.position.x = -1;
        scene.add( object );
    });

    loader.load(renderMeshFile, function ( object ) {
        object.traverse( function ( child ) {
            //there is one mesh and one group
            if ( child instanceof THREE.Mesh ) {
                self.mesh2 = child;

                var tt2 = new THREE.VideoTexture( self.video2 );
                tt2.minFilter = THREE.LinearFilter;
                tt2.format = THREE.RGBFormat;
                child.material = new THREE.MeshBasicMaterial( { map: tt2, side: THREE.DoubleSide, shading: THREE.FlatShading, wireframe: false } );
                child.visible = false;
            }
        } );

        //object.position.x = 1;
        scene.add( object );
    });
}