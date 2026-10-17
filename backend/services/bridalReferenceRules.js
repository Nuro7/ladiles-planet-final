function referenceRules(aspectRatio, mode = 'speed') {
  return [
    'FINAL REFERENCE AUTHORITIES — these rules override conflicting generic styling instructions:',
    'Customer BRIDE_IDENTITY defines only the recognizable face, natural skin tone and facial proportions. Customer DRESS_REFERENCE defines the complete selected garment, stitching, embroidery, fit and drape. Never import a face or dress from cinematic references.',
    'JEWELLERY_REFERENCE is the original bride visible in SOURCE_VIDEO or the attached SCENE/ENVIRONMENT images. Transfer her bridal ornament pieces, arrangement, metal colour, stone style and richness to the customer bride: visible necklaces, earrings, forehead ornament, bangles and other source accessories. Jewellery is expressly allowed from these references even when they are described as environment only. Never use the customer identity photo as the jewellery authority. If source details are unclear, use a rich coordinated bridal set consistent with its cultural styling; do not produce an undecorated bride. Keep every ornament consistent through all shots.',
    `Output framing is ${aspectRatio}; preserve the reference aspect ratio. No landscape conversion of a portrait reference, no stretching or cropping to change orientation.`,
    mode === 'balance'
      ? 'MOTION AUTHORITY: SOURCE_VIDEO governs the action progression, head and hand movement, expressions, slow-motion pace, camera path, framing, shot order and transitions. Transfer that performance to the customer identities and dress; retain the defining action within the output duration.'
      : 'MOTION AUTHORITY: chronological scene stills and the timestamped shot instructions govern action, expressions, slow-motion pace, camera path and transitions. Complete the defining action; do not replace the sequence with generic standing or walking.',
    'Retain the reference environment and lighting while keeping the customer face and garment clear, physically realistic and consistent.',
  ].join('\n');
}
module.exports = { referenceRules };
