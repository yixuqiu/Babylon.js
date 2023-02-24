import { serialize, expandToProperty } from "../Misc/decorators";
import { MaterialDefines } from "./materialDefines";
import { MaterialPluginBase } from "./materialPluginBase";
import { Constants } from "../Engines/constants";
import { MaterialFlags } from "./materialFlags";
import type { Scene } from "core/scene";
import type { Engine } from "core/Engines/engine";
import type { SubMesh } from "core/Meshes/subMesh";
import type { AbstractMesh } from "core/Meshes/abstractMesh";
import { MaterialHelper } from "./materialHelper";
import type { UniformBuffer } from "./uniformBuffer";
import type { PBRBaseMaterial } from "./PBR/pbrBaseMaterial";
import type { StandardMaterial } from "./standardMaterial";

/**
 * @internal
 */
export class DecalMapDefines extends MaterialDefines {
    DECAL = false;
    DECALDIRECTUV = 0;
    DECAL_SMOOTHALPHA = false;
    GAMMADECAL = false;
}

/**
 * Plugin that implements the decal map component of a material
 * @since
 */
export class DecalMapConfiguration extends MaterialPluginBase {
    private _isEnabled = false;
    /**
     * Enables or disables the decal map on this material
     */
    @serialize()
    @expandToProperty("_markAllSubMeshesAsTexturesDirty")
    public isEnabled = false;

    private _smoothAlpha = false;

    /**
     * Enables or disables the smooth alpha mode on this material. Default: false.
     * When enabled, the alpha value used to blend the decal map will be the squared value and will produce a smoother result.
     */
    @serialize()
    @expandToProperty("_markAllSubMeshesAsTexturesDirty")
    public smoothAlpha = false;

    private _internalMarkAllSubMeshesAsTexturesDirty: () => void;

    /** @internal */
    public _markAllSubMeshesAsTexturesDirty(): void {
        this._enable(this._isEnabled);
        this._internalMarkAllSubMeshesAsTexturesDirty();
    }

    /**
     * Creates a new DecalMapConfiguration
     * @param material The material to attach the decal map plugin to
     * @param addToPluginList If the plugin should be added to the material plugin list
     */
    constructor(material: PBRBaseMaterial | StandardMaterial, addToPluginList = true) {
        super(material, "DecalMap", 150, new DecalMapDefines(), addToPluginList);

        this.registerForExtraEvents = true; // because we override the hardBindForSubMesh method
        this._internalMarkAllSubMeshesAsTexturesDirty = material._dirtyCallbacks[Constants.MATERIAL_TextureDirtyFlag];
    }

    public isReadyForSubMesh(defines: DecalMapDefines, scene: Scene, engine: Engine, subMesh: SubMesh): boolean {
        const decalMapGenerator = subMesh.getMesh().decalMapGenerator;

        if (!this._isEnabled || !decalMapGenerator?.texture || !MaterialFlags.DecalMapEnabled || !scene.texturesEnabled) {
            return true;
        }

        return decalMapGenerator.isReady();
    }

    public prepareDefines(defines: DecalMapDefines, scene: Scene, mesh: AbstractMesh): void {
        const decalMapGenerator = mesh.decalMapGenerator;

        if (!this._isEnabled || !decalMapGenerator?.texture || !MaterialFlags.DecalMapEnabled || !scene.texturesEnabled) {
            const isDirty = defines.DECAL;
            if (isDirty) {
                defines.markAsTexturesDirty();
            }
            defines.DECAL = false;
        } else {
            const isDirty = !defines.DECAL || defines.GAMMADECAL !== decalMapGenerator.texture.gammaSpace;
            if (isDirty) {
                defines.markAsTexturesDirty();
            }
            defines.DECAL = true;
            defines.GAMMADECAL = decalMapGenerator.texture.gammaSpace;
            defines.DECAL_SMOOTHALPHA = this._smoothAlpha;
            MaterialHelper.PrepareDefinesForMergedUV(decalMapGenerator.texture, defines, "DECAL");
        }
    }

    /**
     * Note that we override hardBindForSubMesh and not bindForSubMesh because the material can be shared by multiple meshes,
     * in which case mustRebind could return false even though the decal map is different for each mesh: that's because the decal map
     * is not part of the material but hosted by the decalMapGenerator of the mesh instead.
     */
    public hardBindForSubMesh(uniformBuffer: UniformBuffer, scene: Scene, _engine: Engine, subMesh: SubMesh): void {
        const decalMapGenerator = subMesh.getMesh().decalMapGenerator;

        if (!this._isEnabled || !decalMapGenerator?.texture || !MaterialFlags.DecalMapEnabled || !scene.texturesEnabled) {
            return;
        }

        const isFrozen = this._material.isFrozen;
        const texture = decalMapGenerator.texture;

        if (!uniformBuffer.useUbo || !isFrozen || !uniformBuffer.isSync) {
            uniformBuffer.updateFloat4("vDecalInfos", texture.coordinatesIndex, 0, 0, 0);
            MaterialHelper.BindTextureMatrix(texture, uniformBuffer, "decal");
        }

        uniformBuffer.setTexture("decalSampler", texture);
    }

    public getClassName(): string {
        return "DecalMapConfiguration";
    }

    public getSamplers(samplers: string[]): void {
        samplers.push("decalSampler");
    }

    public getUniforms(): { ubo?: Array<{ name: string; size: number; type: string }>; vertex?: string; fragment?: string } {
        return {
            ubo: [
                { name: "vDecalInfos", size: 4, type: "vec4" },
                { name: "decalMatrix", size: 16, type: "mat4" },
            ],
        };
    }
}
