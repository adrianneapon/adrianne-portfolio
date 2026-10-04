import * as THREE from 'three';
import frontUrl from '../../images/img/ID front.png?url';
import backUrl from '../../images/img/ID back.png?url';

// Only the GPU copies are resized; the supplied artwork files remain untouched.
export async function loadArtwork() {
  const images = [];
  try {
    for (const url of [frontUrl, backUrl]) {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Could not load ID artwork: ${url}`);
      images.push(await createImageBitmap(await response.blob(), { resizeWidth: 1200, resizeQuality: 'high' }));
    }
    return images;
  } catch (error) {
    images.forEach(image => image.close());
    throw error;
  }
}

export function makeCardTexture(geometry, originalMap, images) {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 2048;
  const ctx = canvas.getContext('2d');
  // Start clean so the demo artwork cannot remain on a face or card edge.
  ctx.fillStyle = '#020912';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const position = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  const uv = geometry.attributes.uv;

  [1, -1].forEach((sign, face) => {
    let minX = Infinity, minY = Infinity, minU = Infinity, minV = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxU = -Infinity, maxV = -Infinity;
    for (let i = 0; i < position.count; i++) {
      if (normal.getZ(i) * sign < 0.99) continue;
      minX = Math.min(minX, position.getX(i)); maxX = Math.max(maxX, position.getX(i));
      minY = Math.min(minY, position.getY(i)); maxY = Math.max(maxY, position.getY(i));
      minU = Math.min(minU, uv.getX(i)); maxU = Math.max(maxU, uv.getX(i));
      minV = Math.min(minV, uv.getY(i)); maxV = Math.max(maxV, uv.getY(i));
    }
    if (![minX, minY, minU, minV, maxX, maxY, maxU, maxV].every(Number.isFinite)) {
      throw new Error('The original model does not have usable front/back UVs.');
    }
    // Fit in physical face proportions, not atlas proportions. The original
    // front/back UVs already account for orientation when viewed from each side.
    const physicalAspect = (maxX - minX) / (maxY - minY);
    const image = images[face], imageAspect = image.width / image.height;
    const rectWidth = (maxU - minU) * canvas.width;
    const rectHeight = (maxV - minV) * canvas.height;
    const width = rectWidth * Math.min(1, imageAspect / physicalAspect);
    const height = rectHeight * Math.min(1, physicalAspect / imageAspect);
    ctx.drawImage(image, minU * canvas.width + (rectWidth - width) / 2,
      minV * canvas.height + (rectHeight - height) / 2, width, height);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = originalMap.flipY;
  texture.anisotropy = 8;
  return texture;
}

export function makeBlueWeave(reference) {
  // Retain the reference texture's orientation and band proportions, replacing
  // all of its printed pixels with a small unbranded repeating nylon weave.
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(128 * reference.image.width / reference.image.height);
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#EE5122'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let x = 0; x < canvas.width; x += 4) {
    ctx.fillStyle = x % 8 ? '#d94419' : '#fa6535';
    ctx.fillRect(x, 0, 1, canvas.height);
  }
  for (let y = 0; y < canvas.height; y += 3) {
    ctx.fillStyle = 'rgba(70,15,0,0.15)'; ctx.fillRect(0, y, canvas.width, 1);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
