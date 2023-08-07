import { MapsType } from '@Enum/MapType'
import {
  ImageryLayer,
  Viewer,
  WebMapServiceImageryProvider,
  DefaultProxy,
  Resource,
} from 'cesium'
import { inject, ref } from 'vue'
import { ElNotification } from 'element-plus'
import { WmsEndpoint, WmsLayerSummary } from '@camptocamp/ogc-client'
import { ILayerSet } from '@Interface/layers/ILayerSet'
import { uniqueId } from 'lodash'

const layersBox = ref(new Map<string, ImageryLayer>())

export default function useDynamicLayers() {
  const viewer = inject<Viewer>(MapsType.Viewer)!,
    loading = ref(false),
    layers = ref<ILayerSet[]>([]),
    size = ref(layersBox.value.size),
    url = ref('https://wms.geonorge.no/skwms1/wms.adm_enheter_historisk?'),
    refresToken = ref(''),
    error = ref('')

  const addWMSServer = async (input: string) => {
    try {
      url.value = input.split('?')[0]
      error.value = ''
      layers.value.length = 0
      loading.value = true
      const endpoint = await new WmsEndpoint(input).isReady()
      reduceLayers(endpoint.getLayers())
      loading.value = false
      refresToken.value = uniqueId()
    } catch {
      loading.value = false
      error.value = 'Cannot conected with the WMS Server'
    }
  }

  const addLayer = async (input: string, aliasWMS: string) => {
    try {
      console.log(url.value);
      
      if (!layersBox.value.has(aliasWMS)) {
        const layer = new ImageryLayer(
          new WebMapServiceImageryProvider({
            url: url.value,
            layers: input,
            parameters: {
              transparent: true,
              format: 'image/png',
            },
          }),
          {}
        )
        viewer.imageryLayers.add(layer)
        layersBox.value.set(aliasWMS, layer)
      }
    } catch (err) {
      console.error(err)
      ElNotification({
        title: 'Error',
        message: 'Cannot add layers',
        type: 'error',
      })
    }
  }

  const addLayerTmp = async () => {
    try {
      if (!layersBox.value.has('wertwert')) {
        const layer = new ImageryLayer(
          new WebMapServiceImageryProvider({
            url: 'https://wms.geonorge.no/skwms1/wms.adm_enheter_historisk?',
            layers: 'fylker_2017',
            parameters: {
              transparent: true,
              format: 'image/png',
            },
          }),
          {}
        )
        layer.show = false
        viewer.imageryLayers.add(layer)
        layersBox.value.set('wertwert', layer)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const getAllLayers = () => Array.from(layersBox.value.keys())
  const getWMSLayers = () => layers.value
  const ifLayerIsActive = (alias: string) => layersBox.value.get(alias)?.show

  const reduceLayers = (wmsLayer: WmsLayerSummary[]) => {
    wmsLayer.forEach(elem => {
      if (elem.name)
        layers.value.push({
          name: elem.name,
          title: elem.title,
        })
      if (elem.children) reduceLayers(elem.children)
    })
  }

  const visibleLayres = (key: string) => {
    if (layersBox.value.has(key)) {
      const layer = layersBox.value.get(key)!
      layer.show = !layer.show
    }
  }

  const addLayerStrategy = (lay: string[], group: boolean, alias?: string) => {
    const layer = lay.length > 1 ? lay.join(', ') : lay[0]
    if (group) {
      addLayer(layer, alias || `[${layer}]`)
    } else {
      lay.forEach(elem => {
        addLayer(elem, alias ? `${alias} [${elem}]` : elem)
      })
    }
    layers.value.length = 0
  }

  const init = () => {
    addLayerTmp()
  }

  // init()

  return {
    size,
    getAllLayers,
    visibleLayres,
    addLayerStrategy,
    addWMSServer,
    loading,
    getWMSLayers,
    ifLayerIsActive,
    refresToken,
    error,
  }
}
