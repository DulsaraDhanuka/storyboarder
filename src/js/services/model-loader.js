const THREE = require('three')

window.THREE = THREE
const JDLoader = require('../vendor/JDLoader.min.js')

require('../../../node_modules/three/examples/js/loaders/LoaderSupport')
require('../../../node_modules/three/examples/js/loaders/OBJLoader2')
require('../../../node_modules/three/examples/js/loaders/GLTFLoader')
require('../../../node_modules/three/examples/js/loaders/DRACOLoader')
require('../../../node_modules/three/examples/js/loaders/DDSLoader')
require('../../../node_modules/three/examples/js/libs/jszip.min')
require('../../../node_modules/three/examples/js/libs/inflate.min')
require('../../../node_modules/three/examples/js/loaders/FBXLoader')


THREE.DRACOLoader.setDecoderPath( '../../../node_modules/three/examples/js/libs/draco/' )

const MAP_NAMES = [
  'map',
  'aoMap',
  'emissiveMap',
  'glossinessMap',
  'metalnessMap',
  'normalMap',
  'roughnessMap',
  'specularMap',
]

const characterHeights = {
  'adult-male': 1.8,
  'teen-male': 1.6,
  'adult-female': 1.65,
  'teen-female': 1.6
}
const Zlib = require("../../../node_modules/three/examples/js/libs/inflate.min")

window.Zlib = Zlib.Zlib
let loadingManager = new THREE.LoadingManager()
let loader = new THREE.JDLoader()
let fbxLoader = new THREE.FBXLoader(loadingManager)
let objLoader = new THREE.OBJLoader2(loadingManager)
let gltfLoader = new THREE.GLTFLoader(loadingManager)
gltfLoader.setDRACOLoader(new THREE.DRACOLoader())
objLoader.setLogging(false, false)
let textures = {}
let characterModels = {}
let objModels = {}

const loadTextures = () => {
  let imageLoader = new THREE.ImageLoader(loadingManager)

  textures.femaleAdultBody = new THREE.Texture()
  imageLoader.load('data/shot-generator/dummies/textures/female-adult-texture-diff.jpg', ( image ) => {
    textures.femaleAdultBody.image = image
    textures.femaleAdultBody.needsUpdate = true
  })

  textures.maleAdultBody = new THREE.Texture()
  imageLoader.load('data/shot-generator/dummies/textures/male-adult-texture-diff.jpg', ( image ) => {
    textures.maleAdultBody.image = image
    textures.maleAdultBody.needsUpdate = true
  })

  textures.maleYouthBody = new THREE.Texture()
  imageLoader.load('data/shot-generator/dummies/textures/male-youth-texture-diff.jpg', ( image ) => {
    textures.maleYouthBody.image = image
    textures.maleYouthBody.needsUpdate = true
  })

  textures.femaleYouthBody = new THREE.Texture()
  imageLoader.load('data/shot-generator/dummies/textures/female-youth-texture-diff.jpg', ( image ) => {
    textures.femaleYouthBody.image = image
    textures.femaleYouthBody.needsUpdate = true
  })

  textures.chair = new THREE.Texture()
  imageLoader.load('data/shot-generator/objects/chair_uv.png', ( image ) => {
    textures.chair.image = image
    textures.chair.needsUpdate = true
  })

  textures.tree = new THREE.Texture()
  imageLoader.load('data/shot-generator/objects/tree_uv.png', ( image ) => {
    textures.tree.image = image
    textures.tree.needsUpdate = true
  })
}

const loadModelFBXPromise = ( file, textureBody, textureHead, meshHeight ) => {
  return new Promise((resolve, reject) => {
    fbxLoader.load( file, (object) => {
      let mesh = null
      let armature = null
      let obj = new THREE.Object3D()


      object.traverse( function ( child ) {
        if ( child instanceof THREE.Mesh ) {
          mesh = child
        } else {
          if (child instanceof THREE.Group) armature = child
        }
      })
      let bone = mesh.children[0].children[0];
      obj = obj.add(object.children[0])

      let material = new THREE.MeshToonMaterial({
        color: 0xffffff,
        emissive: 0x0,
        specular: 0x0,
        skinning: true,
        shininess: 0,
        flatShading: false,
      })

      let bbox = new THREE.Box3().setFromObject(mesh)
      let height = bbox.max.y - bbox.min.y

      let heightX = bbox.max.x - bbox.min.x
      let heightY = bbox.max.y - bbox.min.y
      let heightZ = bbox.max.z - bbox.min.z
      heightX = heightX > heightY ? heightX : heightY
      heightX = heightX > heightZ ? heightX : heightZ
      height = heightX

      mesh.material = material //[material2, material]
      mesh.rotation.set(0, 0, 0)
      let targetHeight = meshHeight
      //height = height * 100
      let scale = targetHeight / height
      obj.originalHeight = height
      mesh.scale.set(1,1,1)
      //console.log('setting scale: : ', scale)
      obj.scale.set(scale, scale, scale)

      mesh.updateMatrix()
      mesh.renderOrder = 1.0

      resolve (obj)
    })
  })
}

const loadModelGLTFPromise = (file, textureBody, textureHead, meshHeight) => {

  return new Promise((resolve, reject) => {

    gltfLoader.load(file, (data) => {
      let material = new THREE.MeshToonMaterial({
        color: 0xffffff,
        emissive: 0x0,
        specular: 0x0,
        skinning: true,
        shininess: 0,
        flatShading: false,
        morphNormals: true,
        morphTargets: true
      })
      let mesh = null
      let armature = null
      let obj = new THREE.Object3D()
      obj = data.scene.children[0]

      // first type of GLTF structure, where Skinned Mesh and the bone structure are inside the object3D
      for (var i in data.scene.children[0].children) {
        let child = data.scene.children[0].children[i]
        if ( child instanceof THREE.Mesh ) {
          mesh = child.clone()
        } else {
          if (child instanceof THREE.Object3D && armature === null) armature = child //new THREE.Skeleton(child)
        }
      }

      if (mesh === null)
      {
        //try loading second type of GLTF structure, mesh is outside the Object3D that contains the armature
        for (var i in data.scene.children)
        {
          let child = data.scene.children[i]
          if ( child instanceof THREE.Mesh ) {
            mesh = child
            obj.add(mesh)
          }
        }
      }
      material.map = mesh.material.map//.clone()
      material.map.image = textureBody.image
      material.map.needsUpdate = true
      let bbox = new THREE.Box3().setFromObject(mesh)

      let height = bbox.max.y - bbox.min.y
      obj.originalHeight = height
      mesh.material = material
      //mesh.rotation.set(0, Math.PI/2, 0)
      let targetHeight = meshHeight
      let scale = targetHeight / height
      obj.scale.set(scale, scale, scale)
      //mesh.geometry.translate(0, targetHeight/2, 0)
      mesh.renderOrder = 1.0
      mesh.original = data

      resolve(obj)

    })
  })
}

const loadModels = () => {

  objLoader.load( 'data/shot-generator/objects/chair.obj', event => {
    let object = event.detail.loaderRootNode
    object.traverse( function ( child ) {
      if ( child instanceof THREE.Mesh ) {
        var mesh = child
        var bbox = new THREE.Box3().setFromObject(mesh);
        var height = bbox.max.y - bbox.min.y
        var targetHeight = 0.8
        var scale = 8// targetHeight / height
        mesh.scale.set(scale, scale, scale)
        mesh.updateMatrix()

        let material = new THREE.MeshToonMaterial({
          color: 0xffffff,
          emissive: 0x0,
          specular: 0x0,
          skinning: true,
          shininess: 0,
          flatShading: false,
          morphNormals: true,
          morphTargets: true,
          map: textures.chair
        })

        mesh.material = material
        //mesh.material.map = textures.chair
        objModels.chair = mesh
      }
    })
  })

  objLoader.load( 'data/shot-generator/objects/tree.obj', event => {
    let object = event.detail.loaderRootNode
    object.traverse( function ( child ) {
      if ( child instanceof THREE.Mesh ) {
        var mesh = child
        var bbox = new THREE.Box3().setFromObject(mesh);
        var height = bbox.max.y - bbox.min.y
        var targetHeight = 8
        var scale = targetHeight / height
        mesh.scale.set(scale, scale, scale)
        mesh.updateMatrix()
        mesh.material.map = textures.tree
        //mesh.material.color = 0xffffff
        objModels.tree = mesh
      }
    })
  })

  // FBX loading trials
  //const female2 = loadModelFBXPromise("data/shot-generator/dummies/female-adult-test.fbx", textures.femaleAdultBody, textures.maleHead, characterHeights['adult-female'])
  //const male2 = loadModelFBXPromise("data/shot-generator/dummies/male-adult.fbx", textures.maleAdultBody, textures.maleHead, characterHeights.maleAdult)
  //const male_youth2 = loadModelFBXPromise("data/shot-generator/dummies/male-youth.fbx", textures.maleYouthBody, textures.maleHead, characterHeights.maleYouth )

  const female = loadModelGLTFPromise("data/shot-generator/dummies/gltf/female-adult.glb", textures.femaleAdultBody, textures.maleHead, characterHeights['adult-female'] )
  const male = loadModelGLTFPromise("data/shot-generator/dummies/gltf/male-adult.glb", textures.maleAdultBody, textures.maleHead, characterHeights['adult-male'] )
  const male_youth = loadModelGLTFPromise("data/shot-generator/dummies/gltf/male-youth.glb", textures.maleYouthBody, textures.maleHead, characterHeights['teen-male'] )
  const female_youth = loadModelGLTFPromise("data/shot-generator/dummies/gltf/female-youth.glb", textures.femaleYouthBody, textures.maleHead, characterHeights['teen-female'] )

  // return new Promise(resolve => {
  //   loader.manager.onLoad = () => {
  //     resolve(characterModels)
  //   }
  // })

  return Promise.all([ male, male_youth, female_youth, female ]).then( (values) => {
    // GLTF models are loaded async so we're waiting for all of them to get resolved
    characterModels['adult-male'] = values[0]
    characterModels['teen-male'] = values[1]
    characterModels['teen-female'] = values[2]
    characterModels['adult-female'] = values[3]
    return new Promise(resolve => {
      resolve(characterModels) } )
  });

}

function init () {
  loadTextures()
  return loadModels()
}

function getCharacterModels () {
  return characterModels
}

function getObjModels () {
  return objModels
}

module.exports = {
  init,
  getCharacterModels,
  getObjModels
}