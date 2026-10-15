/* VERBATIM from tools/mockups/river/surface-study.html, lines 385-386. Boulder uniforms (field boulders).
   Port this code as it is (same functions, same constants, same noise). Only the plumbing around it may change. */
const cliffU=palU('brown',.35,1),boulderU=palU('brown',.7,0);cliffU.uSunDir={value:SUN.clone()};boulderU.uSunDir={value:SUN.clone()};boulderU.uDbg={value:0};boulderU.uMossP={value:.4};boulderU.uIvy={value:0};boulderU.uMossTop={value:0};boulderU.uUpK={value:.30};boulderU.uUW={value:0};boulderU.uWL={value:0};
const cliffNew=cliffMat(cliffU),cliffOld=rockOld(cliffU),boulderNew=boulderMat(boulderU);
