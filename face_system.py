# face_system.py - REVISED VERSION with improved track ID generation
import cv2
import numpy as np
import pickle
import os
import time
import re
from datetime import datetime
from collections import defaultdict, deque
import warnings
warnings.filterwarnings('ignore')

try:
    import insightface
    from insightface.app import FaceAnalysis
    import mediapipe as mp
except ImportError:
    print("Installing required packages...")
    import subprocess
    subprocess.check_call(['pip', 'install', 'insightface', 'opencv-python', 'mediapipe'])
    import insightface
    from insightface.app import FaceAnalysis
    import mediapipe as mp

class FaceTracker:
    """Tracks faces across frames using Hungarian algorithm for matching."""
    
    def __init__(self, max_disappeared=30, iou_threshold=0.5, max_distance=0.6):
        self.next_id = 0
        self.tracks = {}
        self.disappeared = {}
        self.max_disappeared = max_disappeared
        self.iou_threshold = iou_threshold
        self.max_distance = max_distance
        self.frame_count = 0
        
    @staticmethod
    def iou(box1, box2):
        x1 = max(box1[0], box2[0])
        y1 = max(box1[1], box2[1])
        x2 = min(box1[2], box2[2])
        y2 = min(box1[3], box2[3])
        
        if x2 <= x1 or y2 <= y1:
            return 0.0
        
        intersection = (x2 - x1) * (y2 - y1)
        area1 = (box1[2] - box1[0]) * (box1[3] - box1[1])
        area2 = (box2[2] - box2[0]) * (box2[3] - box2[1])
        
        return intersection / (area1 + area2 - intersection + 1e-6)
    
    @staticmethod
    def cosine_distance(emb1, emb2):
        if emb1 is None or emb2 is None:
            return 1.0
        return 1 - np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2) + 1e-6)
    
    def update(self, detections):
        self.frame_count += 1
        
        if len(detections) == 0:
            for track_id in list(self.tracks.keys()):
                self.disappeared[track_id] += 1
                if self.disappeared[track_id] > self.max_disappeared:
                    self._remove_track(track_id)
            return self._get_current_tracks()
        
        # Add frame information to each detection
        for i, det in enumerate(detections):
            if 'detection_id' not in det:
                det['detection_id'] = f"det_{self.frame_count}_{i}"
        
        if len(self.tracks) == 0:
            for det in detections:
                track_id = self._create_track(det)
                det['track_id'] = track_id  # Assign track_id to detection
            return self._get_current_tracks()
        
        matches = self._match_tracks(detections)
        
        # Assign track_ids to matched detections
        for match in matches:
            track_id, det_idx = match
            self._update_track(track_id, detections[det_idx])
            detections[det_idx]['track_id'] = track_id
        
        # Create tracks for unmatched detections
        unmatched_dets = set(range(len(detections))) - {match[1] for match in matches}
        for det_idx in unmatched_dets:
            track_id = self._create_track(detections[det_idx])
            detections[det_idx]['track_id'] = track_id
        
        # Handle unmatched tracks
        unmatched_tracks = set(self.tracks.keys()) - {match[0] for match in matches}
        for track_id in unmatched_tracks:
            self.disappeared[track_id] += 1
            if self.disappeared[track_id] > self.max_disappeared:
                self._remove_track(track_id)
        
        return self._get_current_tracks()
    
    def _match_tracks(self, detections):
        if not self.tracks or not detections:
            return []
        
        cost_matrix = np.zeros((len(self.tracks), len(detections)))
        track_ids = list(self.tracks.keys())
        
        for i, track_id in enumerate(track_ids):
            track = self.tracks[track_id]
            track_bbox = track['bbox']
            track_emb = track['emb']
            
            for j, det in enumerate(detections):
                iou_score = self.iou(track_bbox, det['bbox'])
                
                emb_distance = 1.0
                if track_emb is not None and det.get('emb') is not None:
                    emb_distance = self.cosine_distance(track_emb, det['emb'])
                
                combined_score = iou_score * 0.7 + (1 - emb_distance) * 0.3
                cost_matrix[i, j] = combined_score
        
        matches = []
        used_detections = set()
        
        for i, track_id in enumerate(track_ids):
            best_match = -1
            best_score = -1
            
            for j in range(len(detections)):
                if j not in used_detections and cost_matrix[i, j] > 0.3:
                    if cost_matrix[i, j] > best_score:
                        best_score = cost_matrix[i, j]
                        best_match = j
            
            if best_match != -1:
                matches.append((track_id, best_match))
                used_detections.add(best_match)
        
        return matches
    
    def _create_track(self, detection):
        track_id = self.next_id
        self.next_id += 1
        
        self.tracks[track_id] = {
            'track_id': track_id,
            'bbox': detection['bbox'],
            'emb': detection.get('emb'),
            'first_seen': self.frame_count,
            'last_seen': self.frame_count,
            'age': 0,
            'recognition_count': 0,
            'last_recognition_time': 0,
            'recognized': False,
            'name': 'Unknown',
            'id_number': 'N/A',
            'section': 'Unknown',
            'confidence': 0.0,
            'detection_id': detection.get('detection_id', f'det_{self.frame_count}_unknown')
        }
        
        self.disappeared[track_id] = 0
        return track_id  # Return the track_id
    
    def _update_track(self, track_id, detection):
        track = self.tracks[track_id]
        
        alpha = 0.3
        old_bbox = track['bbox']
        new_bbox = detection['bbox']
        
        smoothed_bbox = [
            old_bbox[0] * (1 - alpha) + new_bbox[0] * alpha,
            old_bbox[1] * (1 - alpha) + new_bbox[1] * alpha,
            old_bbox[2] * (1 - alpha) + new_bbox[2] * alpha,
            old_bbox[3] * (1 - alpha) + new_bbox[3] * alpha
        ]
        
        track['bbox'] = smoothed_bbox
        
        if detection.get('emb') is not None:
            if track['emb'] is None:
                track['emb'] = detection['emb']
            else:
                track['emb'] = track['emb'] * 0.7 + detection['emb'] * 0.3
                track['emb'] = track['emb'] / np.linalg.norm(track['emb'])
        
        track['last_seen'] = self.frame_count
        track['age'] = self.frame_count - track['first_seen']
        self.disappeared[track_id] = 0
    
    def update_track_recognition(self, track_id, recognition_info):
        if track_id in self.tracks:
            track = self.tracks[track_id]
            track.update({
                'name': recognition_info.get('name', 'Unknown'),
                'id_number': recognition_info.get('id_number', 'N/A'),
                'section': recognition_info.get('section', 'Unknown'),
                'confidence': recognition_info.get('confidence', 0.0),
                'recognized': True,
                'last_recognition_time': self.frame_count,
                'recognition_count': track.get('recognition_count', 0) + 1
            })
    
    def _remove_track(self, track_id):
        if track_id in self.tracks:
            del self.tracks[track_id]
        if track_id in self.disappeared:
            del self.disappeared[track_id]
    
    def _get_current_tracks(self):
        active_tracks = []
        for track_id, track in self.tracks.items():
            if self.disappeared[track_id] <= self.max_disappeared:
                active_tracks.append(track.copy())
        return active_tracks
    
    def get_active_tracks(self):
        tracks = []
        for track_id, track in self.tracks.items():
            if self.disappeared[track_id] <= self.max_disappeared:
                tracks.append({
                    'track_id': track_id,
                    'bbox': track['bbox'],
                    'name': track['name'],
                    'id_number': track.get('id_number', 'N/A'),
                    'section': track['section'],
                    'confidence': track['confidence'],
                    'age': track['age'],
                    'recognition_count': track.get('recognition_count', 0),
                    'disappeared_frames': self.disappeared[track_id],
                    'recognized': track.get('recognized', False)
                })
        return tracks
    
    def clear(self):
        self.tracks.clear()
        self.disappeared.clear()
        self.next_id = 0
        self.frame_count = 0

class HandDetection:
    """Simplified hand detection for reliability"""
    
    def __init__(self):
        self.mp_hands = mp.solutions.hands
        self.hands = self.mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=2,
            min_detection_confidence=0.5,  # Lower for better detection
            min_tracking_confidence=0.5
        )
        
    def detect_hands(self, frame):
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.hands.process(rgb_frame)
        
        hand_landmarks = []
        if results.multi_hand_landmarks:
            print(f"[DEBUG] Detected {len(results.multi_hand_landmarks)} hand(s)")
            for hand_landmark in results.multi_hand_landmarks:
                landmarks = []
                for landmark in hand_landmark.landmark:
                    h, w, _ = frame.shape
                    x, y = int(landmark.x * w), int(landmark.y * h)
                    landmarks.append((x, y))
                hand_landmarks.append(landmarks)
        else:
            print("[DEBUG] No hands detected")
        
        return hand_landmarks
    
    def is_open_palm_simple(self, hand_landmarks):
        """For testing - always return True"""
        print("[DEBUG] Returning True for open palm (testing)")
        return True
        
        # Get key landmarks
        landmarks = hand_landmarks
        wrist = landmarks[0]
        thumb_tip = landmarks[4]
        index_tip = landmarks[8]
        middle_tip = landmarks[12]
        ring_tip = landmarks[16]
        pinky_tip = landmarks[20]
        
        # Check if fingertips are above wrist (raised hand)
        fingertips = [thumb_tip, index_tip, middle_tip, ring_tip, pinky_tip]
        raised_count = sum(1 for tip in fingertips if tip[1] < wrist[1])
        
        # Check if hand is open (fingers spread)
        finger_tips_x = [tip[0] for tip in fingertips]
        x_spread = max(finger_tips_x) - min(finger_tips_x)
        
        # Simple open palm detection
        is_open = raised_count >= 3 and x_spread > 50  # Minimum spread
        
        print(f"[DEBUG] Open palm check: raised={raised_count}/5, spread={x_spread:.1f}, is_open={is_open}")
        return is_open
    
    def is_hand_in_zone_simple(self, hand_landmarks, zone_coords, face_bbox):
        """Simplified zone detection"""
        if not hand_landmarks or len(hand_landmarks) < 5:
            return False, None, False
        
        zone_left, zone_top, zone_right, zone_bottom = zone_coords
        
        # Get wrist position
        wrist = hand_landmarks[0]
        wrist_x, wrist_y = wrist
        
        # Check if wrist is in zone
        wrist_in_zone = (wrist_x >= zone_left and wrist_x <= zone_right and
                        wrist_y >= zone_top and wrist_y <= zone_bottom)
        
        if not wrist_in_zone:
            print(f"[DEBUG] Wrist not in zone: ({wrist_x}, {wrist_y})")
            return False, (wrist_x, wrist_y), False
        
        # Check open palm
        is_open = self.is_open_palm_simple(hand_landmarks)
        
        print(f"[DEBUG] Hand in zone: wrist=({wrist_x}, {wrist_y}), is_open={is_open}")
        return True, (wrist_x, wrist_y), is_open

class FaceRecognitionSystem:
    def __init__(self, model_name='buffalo_l', db_path='face_database.pkl'):
        print("=" * 50)
        print("INITIALIZING FACE RECOGNITION SYSTEM - REVISED TRACKING")
        print("=" * 50)
        
        try:
            self.app = FaceAnalysis(name=model_name, providers=['CPUExecutionProvider'])
            self.app.prepare(ctx_id=-1, det_size=(640, 640))  # Use CPU
            print("[INIT] Face detection model loaded successfully")
        except Exception as e:
            print(f"[ERROR] Failed to load face model: {e}")
            raise
        
        self.db_path = db_path
        self.face_database = {
            'sections': {},
            'section_list': [],
            'id_map': {}
        }
        
        self.recognition_threshold = 0.3  # Lower threshold for testing
        self.registration_threshold = 0.7
        
        self.recognition_cache = {}
        self.cache_timeout = 10.0
        
        self.session_tracking = {}
        
        # Initialize hand detection
        try:
            self.hand_detector = HandDetection()
            self.hand_detection_enabled = True
            print("[INIT] Hand detection initialized SUCCESSFULLY")
        except Exception as e:
            print(f"[ERROR] Hand detection failed: {e}")
            self.hand_detection_enabled = False
        
        self.active_modals = {}
        self.modal_cooldown = 10.0  # Shorter for testing
        
        self.hand_raise_state = {}
        self.personal_zones = {}
        
        self.load_database()
        self.active_registrations = {}
        
        print("[INIT] System ready! Improved tracking active.")
        print("=" * 50)
    
    def load_database(self):
        if os.path.exists(self.db_path):
            try:
                with open(self.db_path, 'rb') as f:
                    self.face_database = pickle.load(f)
                print(f"[DB] Loaded {len(self.face_database['sections'])} sections")
                self.face_database['section_list'] = list(self.face_database['sections'].keys())
                
                if 'id_map' not in self.face_database:
                    self.face_database['id_map'] = {}
                    self._rebuild_id_map()
            except Exception as e:
                print(f"[DB ERROR] {e}")
                self.face_database = {
                    'sections': {},
                    'section_list': [],
                    'id_map': {}
                }
        else:
            print("[DB] No database found, creating new")
            self.face_database = {
                'sections': {},
                'section_list': [],
                'id_map': {}
            }
    
    def _rebuild_id_map(self):
        self.face_database['id_map'] = {}
        for section_name, section_data in self.face_database['sections'].items():
            for person_id, data in section_data.items():
                id_number = data.get('id_number')
                if id_number:
                    self.face_database['id_map'][id_number] = {
                        'section': section_name,
                        'person_id': person_id
                    }
    
    def save_database(self):
        try:
            with open(self.db_path, 'wb') as f:
                pickle.dump(self.face_database, f)
            return True
        except Exception as e:
            print(f"[DB ERROR] Save failed: {e}")
            return False
    
    def create_section(self, section_name):
        if section_name not in self.face_database['sections']:
            self.face_database['sections'][section_name] = {}
            self.face_database['section_list'] = list(self.face_database['sections'].keys())
            self.save_database()
            return {'success': True, 'message': f'Section "{section_name}" created successfully'}
        else:
            return {'success': False, 'message': f'Section "{section_name}" already exists'}
    
    def get_all_sections(self):
        sections = []
        for section_name in self.face_database['section_list']:
            section_data = self.face_database['sections'][section_name]
            sections.append({
                'name': section_name,
                'person_count': len(section_data),
                'total_samples': sum(len(data['embeddings']) for data in section_data.values())
            })
        return sections
    
    def detect_faces(self, frame):
        print(f"[FACE DETECT] Processing frame {frame.shape}")
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        faces = self.app.get(rgb_frame)
        
        results = []
        for face in faces:
            bbox = face.bbox.astype(int)
            landmarks = face.kps
            embedding = face.normed_embedding
            detection_score = face.det_score
            
            if detection_score > 0.3:  # Lower threshold
                results.append({
                    'bbox': bbox,
                    'landmarks': landmarks,
                    'embedding': embedding,
                    'det_score': detection_score
                })
        
        print(f"[FACE DETECT] Found {len(results)} face(s)")
        return results
    
    def _calculate_personal_zone(self, face_bbox, frame_shape):
        frame_h, frame_w = frame_shape[:2]
        face_x1, face_y1, face_x2, face_y2 = face_bbox
        face_width = face_x2 - face_x1
        face_height = face_y2 - face_y1
        
        # LARGER zone for testing
        zone_top = max(0, face_y1 - face_height * 3.0)  # Higher
        zone_bottom = face_y1 + face_height * 0.5
        zone_left = max(0, face_x1 - face_width * 1.5)  # Wider
        zone_right = min(frame_w, face_x2 + face_width * 1.5)
        
        print(f"[ZONE] Face: {face_bbox}, Zone: [{zone_left}, {zone_top}, {zone_right}, {zone_bottom}]")
        return [int(zone_left), int(zone_top), int(zone_right), int(zone_bottom)]
    
    def detect_hands_and_check_modal(self, frame, faces, session_id):
        """SIMPLIFIED WORKING VERSION - Triggers modal when hand detected"""
        print("\n" + "="*50)
        print(f"[MODAL CHECK] Session: {session_id}, Faces: {len(faces)}")
        print("="*50)
        
        if not self.hand_detection_enabled or not session_id:
            return None
        
        # Detect hands
        print("[MODAL] Detecting hands...")
        hand_landmarks = self.hand_detector.detect_hands(frame)
        
        if not hand_landmarks:
            print("[MODAL] No hands detected")
            return None
        
        print(f"[MODAL] {len(hand_landmarks)} hand(s) detected")
        
        # For each face
        for face_idx, face in enumerate(faces):
            # Get track_id from face
            track_id = face.get('track_id')
            if not track_id:
                # Create a simple track_id based on face position
                bbox = face.get('bbox', [0, 0, 100, 100])
                track_id = f"track_{bbox[0]}_{bbox[1]}_{face_idx}"
                print(f"[MODAL] Created track_id: {track_id} for face {face_idx}")
            
            print(f"[MODAL] Checking face {face_idx}: track_id={track_id}, name={face.get('name')}")
            
            # Calculate personal zone
            face_bbox = face.get('bbox', [0, 0, 100, 100])
            personal_zone = self._calculate_personal_zone(face_bbox, frame.shape)
            
            # Check each hand
            for hand_idx, hand in enumerate(hand_landmarks):
                print(f"[MODAL] Checking hand {hand_idx}")
                
                # SIMPLIFIED CHECK: Is wrist in zone?
                if len(hand) > 0:
                    wrist = hand[0]
                    wrist_x, wrist_y = wrist
                    
                    zone_left, zone_top, zone_right, zone_bottom = personal_zone
                    
                    is_in_zone = (wrist_x >= zone_left and wrist_x <= zone_right and
                                wrist_y >= zone_top and wrist_y <= zone_bottom)
                    
                    if is_in_zone:
                        print(f"[MODAL] ✓ Hand {hand_idx} is in zone!")
                        
                        # SIMPLIFIED: Always say it's an open palm for testing
                        print(f"[MODAL] ✓ Assuming open palm (for testing)")
                        
                        # Determine hand side
                        face_center_x = (face_bbox[0] + face_bbox[2]) / 2
                        hand_side = 'right' if wrist_x > face_center_x else 'left'
                        
                        # Create modal info
                        modal_info = {
                            'modal_active': True,
                            'track_id': track_id,
                            'person_name': face.get('name', 'Test Person'),
                            'person_id_number': face.get('id_number', 'TEST001'),
                            'section': face.get('section', 'Testing'),
                            'confidence': face.get('confidence', 0.95),
                            'timestamp': time.time(),
                            'hand_side': hand_side,
                            'hand_position': 'open_palm',
                            'zone_coordinates': personal_zone,
                            'face_bbox': face_bbox,
                            'hand_index': hand_idx,
                            'debug_info': {
                                'detection': 'SIMPLIFIED_TEST',
                                'hand_count': len(hand_landmarks),
                                'time': datetime.now().strftime("%H:%M:%S")
                            }
                        }
                        
                        print(f"[MODAL] ✓✓✓ TRIGGERING MODAL!")
                        print(f"[MODAL] For person: {face.get('name')}")
                        
                        return modal_info
        
        print("[MODAL] No modal triggered")
        return None
    
    def close_modal(self, session_id, track_id):
        if (session_id in self.active_modals and 
            self.active_modals[session_id].get('track_id') == track_id):
            del self.active_modals[session_id]
            return {'success': True, 'message': 'Modal closed'}
        return {'success': False, 'message': 'No active modal found for this track'}
    
    def recognize_faces_with_tracking(self, frame, section_name=None, session_id=None):
        print(f"\n[RECOGNITION] Starting recognition, session: {session_id}")
        
        # Ensure we have a session_id for tracking
        if not session_id:
            session_id = f"session_{int(time.time())}_{hash(frame.tobytes()) % 10000}"
            print(f"[TRACKING] Generated session_id: {session_id}")
        
        if session_id not in self.session_tracking:
            self.session_tracking[session_id] = {
                'tracker': FaceTracker(max_disappeared=30, iou_threshold=0.4, max_distance=0.5),
                'last_cleanup': time.time(),
                'recognized_tracks': {},
                'frame_counter': 0  # Add frame counter for better ID generation
            }
            print(f"[TRACKING] Created new tracker for session {session_id}")
        
        tracker_data = self.session_tracking[session_id]
        tracker = tracker_data['tracker']
        recognized_tracks = tracker_data['recognized_tracks']
        tracker_data['frame_counter'] += 1
        
        # Detect faces
        faces = self.detect_faces(frame)
        
        if not faces:
            print("[RECOGNITION] No faces detected")
            return [], {'total_faces': 0, 'recognized_count': 0, 'cached_count': 0, 'optimization_rate': 100}
        
        # Prepare detections with better track ID assignment
        detections = []
        face_embeddings = []
        for idx, face in enumerate(faces):
            detection = {
                'bbox': face['bbox'],
                'emb': face['embedding'],
                'det_score': face['det_score'],
                'frame_idx': tracker_data['frame_counter'],  # Add frame index
                'face_idx': idx  # Add face index in current frame
            }
            detections.append(detection)
            face_embeddings.append(face['embedding'])
        
        # Update tracker
        active_tracks = tracker.get_active_tracks()
        print(f"[TRACKING] Active tracks: {len(active_tracks)}")
        
        # Assign track IDs to faces before matching
        face_track_map = {}
        for i, face in enumerate(faces):
            best_match_id = None
            best_iou = 0
            
            for track in active_tracks:
                iou_score = tracker.iou(face['bbox'], track['bbox'])
                if iou_score > best_iou and iou_score > 0.3:
                    best_iou = iou_score
                    best_match_id = track['track_id']
            
            face_track_map[i] = best_match_id
        
        # Update tracker with all detections
        tracker.update(detections)
        
        # Get updated active tracks
        active_tracks = tracker.get_active_tracks()
        
        optimization_stats = {
            'total_faces': len(faces),
            'recognized_count': 0,
            'cached_count': 0,
            'optimization_rate': 0
        }
        
        results = []
        faces_needing_recognition = []
        
        for i, face in enumerate(faces):
            track_id = face_track_map[i]
            is_tracked = track_id is not None
            matched_track = None
            
            # Check if we have cached recognition for this track
            if track_id in recognized_tracks:
                matched_track = recognized_tracks[track_id]
                optimization_stats['cached_count'] += 1
                print(f"[TRACKING] Using cached recognition for track {track_id}")
            
            if matched_track:
                name = matched_track['name']
                id_number = matched_track.get('id_number', 'N/A')
                section = matched_track['section']
                confidence = matched_track['confidence']
                needs_recognition = False
                
                if track_id:
                    tracker.update_track_recognition(track_id, {
                        'name': name,
                        'id_number': id_number,
                        'section': section,
                        'confidence': confidence
                    })
            else:
                needs_recognition = True
                name = "Unknown"
                id_number = "N/A"
                section = "Unknown"
                confidence = 0.0
                
                faces_needing_recognition.append({
                    'index': i,
                    'face': face,
                    'embedding': face_embeddings[i],
                    'track_id': track_id
                })
            
            # If no track ID was assigned but face is being tracked, generate one
            if not track_id and is_tracked:
                # Generate a track ID based on face position and frame counter
                bbox = face['bbox']
                track_id = f"track_{bbox[0]}_{bbox[1]}_{tracker_data['frame_counter']}_{i}"
                print(f"[TRACKING] Generated new track_id: {track_id}")
            
            results.append({
                'bbox': face['bbox'].tolist() if isinstance(face['bbox'], np.ndarray) else face['bbox'],
                'landmarks': face['landmarks'].tolist() if isinstance(face['landmarks'], np.ndarray) else face['landmarks'],
                'name': name,
                'id_number': id_number,
                'section': section,
                'confidence': confidence,
                'det_score': float(face['det_score']),
                'tracked': is_tracked,
                'track_id': track_id,  # Ensure track_id is always included
                'needs_recognition': needs_recognition,
                'recognized': (name != "Unknown")
            })
        
        # Perform recognition for new faces
        for face_data in faces_needing_recognition:
            i = face_data['index']
            embedding = face_data['embedding']
            track_id = face_data['track_id']
            
            result = self._recognize_single_face(embedding, section_name)
            optimization_stats['recognized_count'] += 1
            
            # Update the result
            results[i]['name'] = result['name']
            results[i]['id_number'] = result.get('id_number', 'N/A')
            results[i]['section'] = result['section']
            results[i]['confidence'] = result['confidence']
            results[i]['recognized'] = (result['name'] != "Unknown")
            results[i]['needs_recognition'] = False
            
            # If no track_id, generate one now
            if not results[i]['track_id']:
                bbox = results[i]['bbox']
                results[i]['track_id'] = f"track_{bbox[0]}_{bbox[1]}_{tracker_data['frame_counter']}_{i}"
            
            # Cache the recognition if we have a track_id
            if results[i]['track_id'] and result['name'] != "Unknown":
                recognized_tracks[results[i]['track_id']] = {
                    'name': result['name'],
                    'id_number': result.get('id_number', 'N/A'),
                    'section': result['section'],
                    'confidence': result['confidence'],
                    'last_update': time.time()
                }
                
                # Update tracker if we have the track
                if results[i]['track_id'] in [t['track_id'] for t in active_tracks]:
                    tracker.update_track_recognition(results[i]['track_id'], result)
        
        # Calculate optimization
        if optimization_stats['total_faces'] > 0:
            total_processed = optimization_stats['recognized_count'] + optimization_stats['cached_count']
            optimization_stats['optimization_rate'] = round(
                ((optimization_stats['total_faces'] - optimization_stats['recognized_count']) / 
                 optimization_stats['total_faces']) * 100, 1
            )
        
        print(f"[RECOGNITION] Results: {len(results)} faces, {optimization_stats['recognized_count']} recognized")
        print(f"[TRACKING] Track IDs: {[r.get('track_id') for r in results]}")
        
        # CHECK FOR MODAL - IMPORTANT!
        modal_info = None
        if self.hand_detection_enabled and session_id:
            print("[RECOGNITION] Checking for open palm modal...")
            modal_info = self.detect_hands_and_check_modal(frame, results, session_id)
            
            if modal_info:
                print(f"[RECOGNITION] Modal triggered! Adding to face {modal_info.get('track_id')}")
                for result in results:
                    if result.get('track_id') == modal_info.get('track_id'):
                        result['modal_info'] = modal_info
                        print(f"[RECOGNITION] Added modal info to face: {result.get('name')}")
                        break
            else:
                print("[RECOGNITION] No modal triggered")
        
        if results:
            results[0]['optimization_stats'] = optimization_stats
        
        return results, optimization_stats
    
    def _recognize_single_face(self, embedding, section_name=None):
        best_match = None
        best_similarity = -1
        best_name = "Unknown"
        best_id_number = "N/A"
        best_section = None
        
        sections_to_search = []
        if section_name:
            if section_name in self.face_database['sections']:
                sections_to_search = [(section_name, self.face_database['sections'][section_name])]
        else:
            sections_to_search = [(name, self.face_database['sections'][name]) 
                                 for name in self.face_database['section_list']]
        
        for sec_name, section_data in sections_to_search:
            for person_id, data in section_data.items():
                avg_embedding = data.get('avg_embedding')
                if avg_embedding is not None:
                    similarity = np.dot(embedding, avg_embedding) / (
                        np.linalg.norm(embedding) * np.linalg.norm(avg_embedding)
                    )
                    
                    if similarity > best_similarity and similarity > self.recognition_threshold:
                        best_similarity = similarity
                        best_match = person_id
                        best_name = data['name']
                        best_id_number = data.get('id_number', 'N/A')
                        best_section = sec_name
        
        print(f"[RECOG SINGLE] Result: {best_name} ({best_similarity:.3f})")
        return {
            'name': best_name,
            'id_number': best_id_number,
            'section': best_section if best_section else 'Unknown',
            'confidence': float(best_similarity) if best_similarity > 0 else 0.0,
            'matched_id': best_match
        }
    
    def validate_id_number(self, id_number, for_registration=True):
        if not id_number or not id_number.strip():
            return False, "ID number is required"
        
        id_number = id_number.strip()
        
        if not re.match(r'^[A-Za-z0-9\-_]{3,20}$', id_number):
            return False, "ID number must be 3-20 alphanumeric characters (dash and underscore allowed)"
        
        if for_registration and id_number in self.face_database['id_map']:
            section = self.face_database['id_map'][id_number]['section']
            return False, f"ID number '{id_number}' already exists in section '{section}'"
        
        return True, "ID number is valid"
    
    def start_registration(self, session_id, person_name, id_number, section_name, samples_per_angle=5):
        is_valid, message = self.validate_id_number(id_number)
        if not is_valid:
            return {'success': False, 'message': message}
        
        if section_name not in self.face_database['sections']:
            self.create_section(section_name)
        
        person_id = f"person_{id_number}"
        
        self.active_registrations[session_id] = {
            'person_id': person_id,
            'person_name': person_name,
            'id_number': id_number,
            'section_name': section_name,
            'angles': {'front': [], 'left': [], 'right': []},
            'current_angle': 'front',
            'samples_collected': 0,
            'angle_samples': 0,
            'samples_per_angle': samples_per_angle,
            'max_total_samples': samples_per_angle * 3,
            'start_time': datetime.now()
        }
        
        return {
            'success': True,
            'message': f"Started registration for {person_name} (ID: {id_number}) in section '{section_name}'",
            'session_id': session_id,
            'person_name': person_name,
            'id_number': id_number,
            'section_name': section_name,
            'current_angle': 'front'
        }
    
    def process_registration_frame(self, session_id, frame):
        if session_id not in self.active_registrations:
            return {'success': False, 'message': 'No active registration found'}
        
        registration = self.active_registrations[session_id]
        
        faces = self.detect_faces(frame)
        if not faces:
            return {'success': False, 'message': 'No face detected'}
        
        face = max(faces, key=lambda f: (f['bbox'][2] - f['bbox'][0]) * (f['bbox'][3] - f['bbox'][1]))
        
        embedding = face['embedding']
        current_angle = registration['current_angle']
        
        registration['angles'][current_angle].append(embedding)
        registration['angle_samples'] += 1
        registration['samples_collected'] += 1
        
        response = {
            'success': True,
            'current_angle': current_angle,
            'angle_samples': registration['angle_samples'],
            'samples_collected': registration['samples_collected'],
            'total_samples': registration['max_total_samples'],
            'section_name': registration['section_name'],
            'person_name': registration['person_name'],
            'id_number': registration['id_number'],
            'bbox': face['bbox'].tolist() if isinstance(face['bbox'], np.ndarray) else face['bbox'],
            'landmarks': face['landmarks'].tolist() if isinstance(face['landmarks'], np.ndarray) else face['landmarks']
        }
        
        if registration['angle_samples'] >= registration['samples_per_angle']:
            response['angle_complete'] = True
        else:
            response['angle_complete'] = False
        
        return response
    
    def next_registration_angle(self, session_id):
        if session_id not in self.active_registrations:
            return {'success': False, 'message': 'No active registration found'}
        
        registration = self.active_registrations[session_id]
        angles = ['front', 'left', 'right']
        current_idx = angles.index(registration['current_angle'])
        
        if current_idx < len(angles) - 1:
            next_angle = angles[current_idx + 1]
            registration['current_angle'] = next_angle
            registration['angle_samples'] = 0
            
            return {
                'success': True,
                'message': f'Moved to {next_angle} view',
                'current_angle': next_angle
            }
        else:
            return {
                'success': False,
                'message': 'All angles complete! Finish registration.',
                'all_complete': True
            }
    
    def finish_registration(self, session_id):
        if session_id not in self.active_registrations:
            return {'success': False, 'message': 'No active registration found'}
        
        registration = self.active_registrations[session_id]
        section_name = registration['section_name']
        id_number = registration['id_number']
        
        all_embeddings = []
        for angle in ['front', 'left', 'right']:
            all_embeddings.extend(registration['angles'][angle])
        
        if len(all_embeddings) == 0:
            del self.active_registrations[session_id]
            return {'success': False, 'message': 'No samples collected'}
        
        avg_embedding = np.mean(all_embeddings, axis=0)
        avg_embedding = avg_embedding / np.linalg.norm(avg_embedding)
        
        if section_name not in self.face_database['sections']:
            self.face_database['sections'][section_name] = {}
        
        person_id = f"person_{id_number}"
        self.face_database['sections'][section_name][person_id] = {
            'name': registration['person_name'],
            'id_number': id_number,
            'embeddings': all_embeddings,
            'avg_embedding': avg_embedding,
            'metadata': {
                'registration_date': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                'section': section_name,
                'samples_per_angle': registration['samples_per_angle'],
                'total_samples': len(all_embeddings),
                'angles_collected': {angle: len(embeds) for angle, embeds in registration['angles'].items()}
            }
        }
        
        self.face_database['id_map'][id_number] = {
            'section': section_name,
            'person_id': person_id
        }
        
        self.face_database['section_list'] = list(self.face_database['sections'].keys())
        self.save_database()
        
        person_name = registration['person_name']
        del self.active_registrations[session_id]
        
        return {
            'success': True,
            'message': f'Registration complete for {person_name} (ID: {id_number}) in section "{section_name}"',
            'person_id': person_id,
            'person_name': person_name,
            'id_number': id_number,
            'section_name': section_name,
            'total_samples': len(all_embeddings)
        }
    
    def cancel_registration(self, session_id):
        if session_id in self.active_registrations:
            person_name = self.active_registrations[session_id]['person_name']
            id_number = self.active_registrations[session_id]['id_number']
            section_name = self.active_registrations[session_id]['section_name']
            del self.active_registrations[session_id]
            return {'success': True, 'message': f'Registration cancelled for {person_name} (ID: {id_number}) in section "{section_name}"'}
        return {'success': False, 'message': 'No active registration found'}
    
    def get_database_stats(self):
        total_persons = 0
        total_samples = 0
        
        for section_name, section_data in self.face_database['sections'].items():
            total_persons += len(section_data)
            total_samples += sum(len(data['embeddings']) for data in section_data.values())
        
        sections = []
        for section_name in self.face_database['section_list']:
            section_data = self.face_database['sections'][section_name]
            section_persons = []
            
            for pid, data in section_data.items():
                section_persons.append({
                    'id': pid,
                    'name': data['name'],
                    'id_number': data.get('id_number', 'N/A'),
                    'total_samples': len(data['embeddings']),
                    'registration_date': data['metadata']['registration_date']
                })
            
            sections.append({
                'name': section_name,
                'person_count': len(section_data),
                'total_samples': sum(len(data['embeddings']) for data in section_data.values()),
                'persons': section_persons
            })
        
        return {
            'total_sections': len(self.face_database['sections']),
            'total_persons': total_persons,
            'total_samples': total_samples,
            'sections': sections
        }
    
    def get_section_persons(self, section_name):
        if section_name not in self.face_database['sections']:
            return []
        
        persons = []
        section_data = self.face_database['sections'][section_name]
        
        for pid, data in section_data.items():
            persons.append({
                'id': pid,
                'name': data['name'],
                'id_number': data.get('id_number', 'N/A'),
                'total_samples': len(data['embeddings']),
                'registration_date': data['metadata']['registration_date']
            })
        
        return persons
    
    def delete_section(self, section_name):
        if section_name in self.face_database['sections']:
            section_data = self.face_database['sections'][section_name]
            for person_id, data in section_data.items():
                id_number = data.get('id_number')
                if id_number and id_number in self.face_database['id_map']:
                    del self.face_database['id_map'][id_number]
            
            del self.face_database['sections'][section_name]
            self.face_database['section_list'] = list(self.face_database['sections'].keys())
            self.save_database()
            return {'success': True, 'message': f'Section "{section_name}" deleted successfully'}
        return {'success': False, 'message': f'Section "{section_name}" not found'}
    
    def clear_session_tracking(self, session_id):
        if session_id in self.session_tracking:
            del self.session_tracking[session_id]
            return {'success': True, 'message': f'Tracking cleared for session {session_id}'}
        return {'success': False, 'message': f'No tracking data for session {session_id}'}
    
    def check_id_availability(self, id_number):
        is_valid, message = self.validate_id_number(id_number)
        if not is_valid:
            return {'available': False, 'message': message}
        
        return {'available': True, 'message': f'ID number "{id_number}" is available'}