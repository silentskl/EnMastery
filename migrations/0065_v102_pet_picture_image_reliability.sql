PRAGMA foreign_keys = ON;
-- Fix PET practice photographs: replace third-party redirect/download pages with
-- direct Pexels image CDN URLs, and keep a same-origin server-side proxy fallback.
-- Image assets were chosen from published free-to-use Pexels photo pages.

UPDATE content_versions SET body_json=json_set(body_json,
 '$.stimulusImageUrl','https://images.pexels.com/photos/5212354/pexels-photo-5212354.jpeg?auto=compress&cs=tinysrgb&w=1200',
 '$.stimulusImageAlt','Teacher helping students with classwork at classroom desks.',
 '$.stimulusImageFallbackUrl','/api/student/speaking/pet-image/pet-speak-classroom')
 WHERE id='pet-speak-classroom-v2' AND json_extract(body_json,'$.examTrack')='PET';

UPDATE content_versions SET body_json=json_set(body_json,
 '$.stimulusImageUrl','https://images.pexels.com/photos/5907626/pexels-photo-5907626.jpeg?auto=compress&cs=tinysrgb&w=1200',
 '$.stimulusImageAlt','A mother cuts vegetables while her daughter helps cook in the kitchen.',
 '$.stimulusImageFallbackUrl','/api/student/speaking/pet-image/pet-speak-cooking')
 WHERE id='pet-speak-cooking-v2' AND json_extract(body_json,'$.examTrack')='PET';

UPDATE content_versions SET body_json=json_set(body_json,
 '$.stimulusImageUrl','https://images.pexels.com/photos/8214423/pexels-photo-8214423.jpeg?auto=compress&cs=tinysrgb&w=1200',
 '$.stimulusImageAlt','A vendor and customer choose fruit together at a market stall.',
 '$.stimulusImageFallbackUrl','/api/student/speaking/pet-image/pet-speak-shopping')
 WHERE id='pet-speak-shopping-v2' AND json_extract(body_json,'$.examTrack')='PET';

UPDATE content_versions SET body_json=json_set(body_json,
 '$.stimulusImageUrl','https://images.pexels.com/photos/8941644/pexels-photo-8941644.jpeg?auto=compress&cs=tinysrgb&w=1200',
 '$.stimulusImageAlt','Children playing football together on a sports field.',
 '$.stimulusImageFallbackUrl','/api/student/speaking/pet-image/pet-speak-football')
 WHERE id='pet-speak-football-v2' AND json_extract(body_json,'$.examTrack')='PET';

UPDATE content_versions SET body_json=json_set(body_json,
 '$.stimulusImageUrl','https://images.pexels.com/photos/9543735/pexels-photo-9543735.jpeg?auto=compress&cs=tinysrgb&w=1200',
 '$.stimulusImageAlt','Volunteers collect plastic litter into bags in a natural park.',
 '$.stimulusImageFallbackUrl','/api/student/speaking/pet-image/pet-speak-park')
 WHERE id='pet-speak-park-v2' AND json_extract(body_json,'$.examTrack')='PET';

UPDATE content_versions SET body_json=json_set(body_json,
 '$.stimulusImageUrl','https://images.pexels.com/photos/4920898/pexels-photo-4920898.jpeg?auto=compress&cs=tinysrgb&w=1200',
 '$.stimulusImageAlt','A group of friends talk and laugh together over hot drinks in a cafe.',
 '$.stimulusImageFallbackUrl','/api/student/speaking/pet-image/pet-speak-cafe')
 WHERE id='pet-speak-cafe-v2' AND json_extract(body_json,'$.examTrack')='PET';

UPDATE content_versions SET body_json=json_set(body_json,
 '$.stimulusImageUrl','https://images.pexels.com/photos/8919589/pexels-photo-8919589.jpeg?auto=compress&cs=tinysrgb&w=1200',
 '$.stimulusImageAlt','Passengers sit with colourful luggage waiting in an airport terminal.',
 '$.stimulusImageFallbackUrl','/api/student/speaking/pet-image/pet-speak-travel')
 WHERE id='pet-speak-travel-v2' AND json_extract(body_json,'$.examTrack')='PET';

UPDATE content_versions SET body_json=json_set(body_json,
 '$.stimulusImageUrl','https://images.pexels.com/photos/7100318/pexels-photo-7100318.jpeg?auto=compress&cs=tinysrgb&w=1200',
 '$.stimulusImageAlt','Children at a birthday party blow out candles on a birthday cake.',
 '$.stimulusImageFallbackUrl','/api/student/speaking/pet-image/pet-speak-party')
 WHERE id='pet-speak-party-v2' AND json_extract(body_json,'$.examTrack')='PET';

UPDATE content_versions SET body_json=json_set(body_json,
 '$.stimulusImageUrl','https://images.pexels.com/photos/9572700/pexels-photo-9572700.jpeg?auto=compress&cs=tinysrgb&w=1200',
 '$.stimulusImageAlt','Students sit at a table and study together surrounded by library bookshelves.',
 '$.stimulusImageFallbackUrl','/api/student/speaking/pet-image/pet-speak-library')
 WHERE id='pet-speak-library-v2' AND json_extract(body_json,'$.examTrack')='PET';

UPDATE content_versions SET body_json=json_set(body_json,
 '$.stimulusImageUrl','https://images.pexels.com/photos/8925997/pexels-photo-8925997.jpeg?auto=compress&cs=tinysrgb&w=1200',
 '$.stimulusImageAlt','Children play football together on a sunny sandy beach.',
 '$.stimulusImageFallbackUrl','/api/student/speaking/pet-image/pet-speak-beach')
 WHERE id='pet-speak-beach-v2' AND json_extract(body_json,'$.examTrack')='PET';
