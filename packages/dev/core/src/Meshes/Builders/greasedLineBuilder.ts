import type { GreasedLineMaterialOptions } from "../../Materials/greasedLinePluginMaterial";
import { GreasedLineMeshMaterialType, GreasedLinePluginMaterial } from "../../Materials/greasedLinePluginMaterial";
import { StandardMaterial } from "./../../Materials/standardMaterial";
import { PBRMaterial } from "../../Materials/PBR/pbrMaterial";
import type { Nullable } from "../../types";
import type { GreasedLineMeshOptions } from "../greasedLineMesh";
import { GreasedLineMesh } from "../greasedLineMesh";
import type { Scene } from "../../scene";
import { EngineStore } from "../../Engines/engineStore";
import type { Color3 } from "core/Maths/math.color";

/**
 * How are the colors distributed along the color table
 * {@link https://doc.babylonjs.com/features/featuresDeepDive/mesh/creation/param/greased_line#colors-and-colordistribution}
 */
export enum GreasedLineMeshColorDistribution {
    /**
     * Do no modify the color table
     */
    COLOR_DISTRIBUTION_NONE = 0,
    /**
     * Repeat the colors until the color table is full
     */
    COLOR_DISTRIBUTION_REPEAT = 1,
    /**
     * Distribute the colors evenly through the color table
     */
    COLOR_DISTRIBUTION_EVEN = 2,
    /**
     * Put the colors to start of the color table a fill the rest with the default color
     */
    COLOR_DISTRIBUTION_START = 3,
    /**
     * Put the colors to the end of the color table and fill the rest with the default color
     */
    COLOR_DISTRIBUTION_END = 4,
    /**
     * Put the colors to start and to the end of the color table and fill the gap between with the default color
     */
    COLOR_DISTRIBUTION_START_END = 5,
}

/**
 * How are the widths distributed along the width table
 * {@link https://doc.babylonjs.com/features/featuresDeepDive/mesh/creation/param/greased_line#widths-and-widthdistribution}
 */
export enum GreasedLineMeshWidthDistribution {
    /**
     * Do no modify the width table
     */
    WIDTH_DISTRIBUTION_NONE = 0,
    /**
     * Repeat the widths until the width table is full
     */
    WIDTH_DISTRIBUTION_REPEAT = 1,
    /**
     * Distribute the widths evenly through the width table
     */
    WIDTH_DISTRIBUTION_EVEN = 2,
    /**
     * Put the widths to start of the width table a fill the rest with the default width
     */
    WIDTH_DISTRIBUTION_START = 3,
    /**
     * Put the widths to the end of the width table and fill the rest with the default width
     */
    WIDTH_DISTRIBUTION_END = 4,
    /**
     * Put the widths to start and to the end of the width table and fill the gap between with the default width
     */
    WIDTH_DISTRIBUTION_START_END = 5,
}

/**
 * Material options for GreasedLineBuilder
 */
export interface GreasedLineMaterialBuilderOptions extends GreasedLineMaterialOptions {
    /**
     * If set to true a new material will be created and a new material plugin will be attached
     * to the material. The material will be set on the mesh. If the instance option is specified in the mesh options,
     * no material will be created/assigned. Defaults to true.
     */
    createAndAssignMaterial?: boolean;
    /**
     * Distribution of the colors if the color table contains fewer entries than needed. Defaults to GreasedLineMeshColorDistribution.COLOR_DISTRIBUTION_START
     * @see CompleteGreasedLineColorTable
     */
    colorDistribution?: GreasedLineMeshColorDistribution;
}

/**
 * Line mesh options for GreasedLineBuilder
 */
export interface GreasedLineMeshBuilderOptions extends GreasedLineMeshOptions {
    /**
     * Distribution of the widths if the width table contains fewer entries than needed. Defaults to GreasedLineMeshWidthDistribution.WIDTH_DISTRIBUTION_START
     * @see CompleteGreasedLineWidthTable
     */
    widthDistribution?: GreasedLineMeshWidthDistribution;
}

/**
 * Builder class for create GreasedLineMeshes
 */

/**
 * Creates a new @see GreasedLinePluginMaterial
 * @param name name of the material
 * @param options material options @see GreasedLineMaterialOptions
 * @param scene scene or null to use the last scene
 * @returns StandardMaterial or PBRMaterial with the @see GreasedLinePluginMaterial attached to it
 */
export function CreateGreasedLineMaterial(name: string, options: GreasedLineMaterialOptions, scene: Nullable<Scene>) {
    scene = <Scene>(scene ?? EngineStore.LastCreatedScene);

    const material = options.materialType === GreasedLineMeshMaterialType.MATERIAL_TYPE_PBR ? new PBRMaterial(name, scene) : new StandardMaterial(name, scene);
    new GreasedLinePluginMaterial(material, scene, options);

    return material;
}
/**
 * Creates a GreasedLine mesh
 * @param name name of the mesh
 * @param options options for the mesh
 * @param materialOptions material options for the mesh
 * @param scene scene where the mesh will be created
 * @returns instance of GreasedLineMesh
 */
export function CreateGreasedLine(name: string, options: GreasedLineMeshBuilderOptions, materialOptions?: Nullable<GreasedLineMaterialBuilderOptions>, scene?: Nullable<Scene>) {
    scene = <Scene>(scene ?? EngineStore.LastCreatedScene);

    let instance;
    const allPoints = GreasedLineMesh.ConvertPoints(options.points);

    let length = 0;
    if (Array.isArray(allPoints[0])) {
        allPoints.forEach((points) => {
            length += points.length / 3;
        });
    }

    options.widthDistribution = options.widthDistribution ?? GreasedLineMeshWidthDistribution.WIDTH_DISTRIBUTION_START;

    materialOptions = materialOptions ?? {
        color: GreasedLinePluginMaterial.DEFAULT_COLOR,
    };
    materialOptions.createAndAssignMaterial = materialOptions.createAndAssignMaterial ?? true;
    materialOptions.colorDistribution = materialOptions?.colorDistribution ?? GreasedLineMeshColorDistribution.COLOR_DISTRIBUTION_START;

    const widths = CompleteGreasedLineWidthTable(length, options.widths ?? [], options.widthDistribution);

    const colors = materialOptions?.colors
        ? CompleteGreasedLineColorTable(length, materialOptions.colors, materialOptions.colorDistribution, materialOptions.color ?? GreasedLinePluginMaterial.DEFAULT_COLOR)
        : undefined;

    // create new mesh if instance is not defined
    if (!options.instance) {
        const initialGreasedLineOptions: GreasedLineMeshOptions = {
            points: allPoints,
            updatable: options.updatable,
            widths,
            lazy: options.lazy,
        };

        instance = new GreasedLineMesh(name, scene, initialGreasedLineOptions);

        if (materialOptions) {
            const initialMaterialOptions: GreasedLineMaterialOptions = {
                materialType: materialOptions.materialType,
                dashCount: materialOptions.dashCount,
                dashOffset: materialOptions.dashOffset,
                dashRatio: materialOptions.dashRatio,
                resolution: materialOptions.resolution,
                sizeAttenuation: materialOptions.sizeAttenuation,
                useColors: materialOptions.useColors,
                useDash: materialOptions.useDash,
                visibility: materialOptions.visibility,
                width: materialOptions.width,
                color: materialOptions.color,
                colorMode: materialOptions.colorMode,
                colorsSampling: materialOptions.colorsSampling,
                colorDistributionType: materialOptions.colorDistributionType,
                colors,
            };

            if (materialOptions.createAndAssignMaterial) {
                const material = materialOptions.materialType === GreasedLineMeshMaterialType.MATERIAL_TYPE_PBR ? new PBRMaterial(name, scene) : new StandardMaterial(name, scene);
                new GreasedLinePluginMaterial(material, scene, initialMaterialOptions);
                instance.material = material;
            }
        }
    } else {
        // update the data on the mesh instance
        instance = options.instance;
        const currentWidths = instance.widths;

        if (currentWidths) {
            const newWidths = currentWidths.slice();
            for (const w of widths) {
                newWidths.push(w);
            }
            instance.widths = newWidths;
        } else {
            instance.widths = widths;
        }
        instance.addPoints(allPoints);
    }

    // add colors
    // it will merge if any colors already on the instance
    if (colors && options.instance) {
        if (options.instance.material instanceof StandardMaterial || instance.material instanceof PBRMaterial) {
            if (options.instance.greasedLineMaterial) {
                const currentColors = options.instance.greasedLineMaterial.colors;
                if (currentColors) {
                    const newColors = currentColors.concat(colors);
                    options.instance.greasedLineMaterial.setColors(newColors, instance.isLazy());
                }
            }
        }
    }

    return instance;
}

/**
 * Completes the width table/fills the missing entries. It means it creates a width entry for every point of the line mesh.
 * You can provide more points the widths when creating the mesh. This function will fill the empty entries.
 * The algorithm used to fill the empty entries can be
 * GreasedLineMeshWidthDistribution.REPEAT - the width table will be repeatedly copied to the empty values [wL, wU] = [wL, wU, wL, wU, wL, wU, wL, wU, ...]
 * GreasedLineMeshWidthDistribution.EVEN - the width table will be evenly copied to the empty values [wL, wU] = [wL, wL, wL, wL, wU, wU, wU, wU]
 * GreasedLineMeshWidthDistribution.START - the width table will be copied at the start of the empty values
 * and rest will be filled width the default width upper and default width lower values [wU, wL] = [wL, wU, dwL, dwU, dwL, dwU, dwL, dwU]
 * GreasedLineMeshWidthDistribution.END - the width table will be copied at the end of the empty values
 * and rest will be filled width the default values [wL, wU] = [wL, wU, dwL, dwU, dwL, dwU, wL, wU]
 * @param pointCount number of points of the line mesh
 * @param widths array of widths [widhtLower, widthUpper, widthLower, widthUpper ...]. Two widths (lower/upper) per point.
 * @param widthsDistribution how to distribute widths if the widths array has fewer entries than pointCount
 * @param defaultWidthUpper the default value which will be used to fill empty width entries - upper width
 * @param defaultWidthLower the default value which will be used to fill empty width entries - lower width
 * @returns completed width table.
 */
export function CompleteGreasedLineWidthTable(
    pointCount: number,
    widths: number[],
    widthsDistribution: GreasedLineMeshWidthDistribution,
    defaultWidthUpper = 1,
    defaultWidthLower = 1
): number[] {
    const missingCount = pointCount - widths.length / 2;

    const widthsData: number[] = [];
    if (missingCount < 0) {
        return widths.slice(0, pointCount * 2);
    }

    // is the width table shorter than the point table?
    if (missingCount > 0) {
        // it is, fill in the missing elements
        if (widthsDistribution === GreasedLineMeshWidthDistribution.WIDTH_DISTRIBUTION_START_END) {
            const halfCount = Math.floor(widths.length / 2);

            // start sector
            for (let i = 0, j = 0; i < halfCount - 1; i++) {
                widthsData.push(widths[j++]);
                widthsData.push(widths[j++]);
            }

            // middle sector
            const widthL = widths[halfCount / 2];
            const widthU = widths[halfCount / 2 + 1];
            for (let i = 0; i < missingCount; i++) {
                widthsData.push(widthU);
                widthsData.push(widthL);
            }

            // end sector
            for (let i = halfCount; i < widths.length; i += 2) {
                widthsData.push(widths[i]);
                widthsData.push(widths[i + 1]);
            }
        } else if (widthsDistribution === GreasedLineMeshWidthDistribution.WIDTH_DISTRIBUTION_START) {
            // start sector
            for (let i = 0; i < widths.length; i += 2) {
                widthsData.push(widths[i]);
                widthsData.push(widths[i + 1]);
            }

            // end sector
            for (let i = 0; i < missingCount; i++) {
                widthsData.push(defaultWidthUpper);
                widthsData.push(defaultWidthLower);
            }
        } else if (widthsDistribution === GreasedLineMeshWidthDistribution.WIDTH_DISTRIBUTION_END) {
            // start sector
            for (let i = 0; i < missingCount; i++) {
                widthsData.push(defaultWidthUpper);
                widthsData.push(defaultWidthLower);
            }

            // end sector
            for (let i = 0; i < widths.length; i += 2) {
                widthsData.push(widths[i]);
                widthsData.push(widths[i + 1]);
            }
        } else if (widthsDistribution === GreasedLineMeshWidthDistribution.WIDTH_DISTRIBUTION_REPEAT) {
            let i = 0;
            for (let x = 0; x < pointCount; x++) {
                widthsData.push(widths[i++]);
                widthsData.push(widths[i++]);

                if (i === widths.length) {
                    i = 0;
                }
            }
        } else if (widthsDistribution === GreasedLineMeshWidthDistribution.WIDTH_DISTRIBUTION_EVEN) {
            let j = 0;
            const widthsectorLength = widths.length / ((pointCount - 1) * 2);
            for (let x = 0; x < pointCount; x++) {
                const i = Math.floor(j);

                widthsData.push(widths[i]);
                widthsData.push(widths[i + 1]);

                j += widthsectorLength;
            }
        }
    } else {
        for (let i = 0; i < widths.length; i++) {
            widthsData.push(widths[i]);
        }
    }

    return widthsData;
}

/**
 * Completes the color table/fill the missing color entries. It means it creates a color entry for every point of the line mesh.
 * You can provide more points the colors when creating the mesh. This function will fill the empty entries.
 * The algorithm used to fill the empty entries can be
 * GreasedLineMesColorhDistribution.REPEAT - the color table will be repeatedly copied to the empty values [c1, c2] = [c1, c2, c1, c2, c1, c2, c1, c2]
 * GreasedLineMesColorhDistribution.EVEN - the color table will be evenly copied to the empty values [c1, c2] = [c1, c1, c1, c1, c2, c2, c2, c2]
 * GreasedLineMesColorhDistribution.START - the color table will be copied at the start of the empty values
 * and rest will be filled color the default color value [c1, c2] = [c1, c2, dc, dc, dc, dc, dc, dc]
 * GreasedLineMesColorhDistribution.START_END - the color table will be copied at the start and the end of the empty values
 * and rest will be filled color the default color value [c1, c2] = [c1, c2, dc, dc, dc, dc, c1, c2]
 * @param pointCount number of points of the line mesh
 * @param colors array of Color3 for the color table
 * @param colorDistribution how to distribute colors if the colors array has fewer entries than pointCount
 * @param defaultColor default color to be used to fill empty entries in the color table
 * @returns completed array of Color3s
 */
export function CompleteGreasedLineColorTable(pointCount: number, colors: Color3[], colorDistribution: GreasedLineMeshColorDistribution, defaultColor: Color3): Color3[] {
    const missingCount = pointCount - colors.length;
    if (missingCount < 0) {
        return colors.slice(0, pointCount);
    }

    const colorsData: Color3[] = [];
    // is the color table shorter than the point table?
    if (missingCount > 0) {
        // it is, fill in the missing elements
        if (colorDistribution === GreasedLineMeshColorDistribution.COLOR_DISTRIBUTION_START_END) {
            const halfCount = Math.floor(colors.length / 2);

            // start sector
            for (let i = 0; i < halfCount; i++) {
                colorsData.push(colors[i]);
            }

            // middle sector
            for (let i = 0; i < missingCount - 1; i++) {
                colorsData.push(defaultColor);
            }

            // end sector
            for (let i = halfCount; i < colors.length; i++) {
                colorsData.push(colors[i]);
            }
        } else if (colorDistribution === GreasedLineMeshColorDistribution.COLOR_DISTRIBUTION_START) {
            // start sector
            for (let i = 0; i < colors.length; i++) {
                colorsData.push(colors[i]);
            }

            // end sector
            for (let i = 0; i < missingCount; i++) {
                colorsData.push(defaultColor);
            }
        } else if (colorDistribution === GreasedLineMeshColorDistribution.COLOR_DISTRIBUTION_END) {
            // start sector
            for (let i = 0; i < missingCount - 1; i++) {
                colorsData.push(defaultColor);
            }

            // end sector
            for (let i = 0; i < colors.length; i++) {
                colorsData.push(colors[i]);
            }
        } else if (colorDistribution === GreasedLineMeshColorDistribution.COLOR_DISTRIBUTION_REPEAT) {
            let i = 0;
            for (let x = 0; x < pointCount; x++) {
                colorsData.push(colors[i]);

                i++;

                if (i === colors.length) {
                    i = 0;
                }
            }
        } else if (colorDistribution === GreasedLineMeshColorDistribution.COLOR_DISTRIBUTION_EVEN) {
            let j = 0;
            const colorSectorLength = colors.length / (pointCount - 1);
            for (let x = 0; x < pointCount - 1; x++) {
                const i = Math.floor(j);

                colorsData.push(colors[i]);

                j += colorSectorLength;
            }
        } else if (colorDistribution === GreasedLineMeshColorDistribution.COLOR_DISTRIBUTION_NONE) {
            for (let i = 0; i < colors.length; i++) {
                colorsData.push(colors[i]);
            }
        }
    } else {
        for (let i = 0; i < pointCount; i++) {
            colorsData.push(colors[i]);
        }
    }

    return colorsData;
}
``;