import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, 
  Upload, 
  MapPin, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  Smartphone, 
  ShieldCheck,
  ArrowRight,
  Info
} from 'lucide-react';
import { api } from '../services/api';
import { GeoProofPreview } from '../types';
import { MapComponent } from '../components/MapComponent';
import { ProvenanceTag } from '../components/ProvenanceTag';

export const ReportSubmission: React.FC = () => {
  const navigate = useNavigate();

  const [captureMode, setCaptureMode] = useState<'gallery' | 'camera' | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  
  // Location states
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [locationSource, setLocationSource] = useState<string>('unknown');
  const [addressLabel, setAddressLabel] = useState<string>('');
  const [isManualPin, setIsManualPin] = useState(false);
  const [showMapAdjust, setShowMapAdjust] = useState(false);

  // Analysis pre-check state
  const [analyzingMetadata, setAnalyzingMetadata] = useState(false);
  const [geoProofData, setGeoProofData] = useState<GeoProofPreview | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submissionReceipt, setSubmissionReceipt] = useState<any | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // 1. Handle File Selection (Gallery or Camera)
  const handleFileChange = async (file: File, mode: 'gallery' | 'camera') => {
    setSelectedFile(file);
    setCaptureMode(mode);
    setImagePreviewUrl(URL.createObjectURL(file));
    setAnalyzingMetadata(true);

    try {
      // Step A: Pre-check EXIF metadata on backend
      const preview = await api.precheckMetadata(file);
      setGeoProofData(preview);

      if (preview.exif_gps_found && preview.latitude && preview.longitude) {
        // EXIF GPS available!
        setLatitude(preview.latitude);
        setLongitude(preview.longitude);
        setLocationSource('photo_exif');
        setAddressLabel(preview.readable_address || 'Address detected from photo metadata');
      } else {
        // Missing EXIF GPS
        if (mode === 'camera') {
          // Camera capture: request browser GPS
          requestBrowserLocation('device_gps_at_capture');
        } else {
          // Gallery photo without GPS: offer device GPS as submission location only
          setLocationSource('unknown');
        }
      }
    } catch (err: any) {
      console.warn('Metadata analysis warning:', err);
    } finally {
      setAnalyzingMetadata(false);
    }
  };

  // 2. Request Browser Geolocation API
  const requestBrowserLocation = (sourceType: 'device_gps_at_capture' | 'device_gps_at_submission') => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const acc = pos.coords.accuracy;

        setLatitude(lat);
        setLongitude(lon);
        setAccuracy(acc);
        setLocationSource(sourceType);

        try {
          const rev = await api.reverseGeocode(lat, lon);
          setAddressLabel(rev.readable_address);
        } catch (_) {
          setAddressLabel(`${lat.toFixed(4)}°, ${lon.toFixed(4)}° (Bengaluru)`);
        }
      },
      (error) => {
        console.warn('Geolocation error:', error.message);
        // Fallback to manual pin
        setShowMapAdjust(true);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // 3. Handle Manual Pin on Map
  const handleMapPinSelected = async (lat: number, lon: number) => {
    setLatitude(lat);
    setLongitude(lon);
    setAccuracy(15.0);
    setLocationSource('manual_map_pin');
    setIsManualPin(true);

    try {
      const rev = await api.reverseGeocode(lat, lon);
      setAddressLabel(rev.readable_address);
    } catch (_) {
      setAddressLabel(`${lat.toFixed(4)}°, ${lon.toFixed(4)}°`);
    }
  };

  // 4. Submit Report
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('capture_mode', captureMode || 'gallery');
      if (description) formData.append('description', description);

      if (isManualPin && latitude && longitude) {
        formData.append('user_selected_latitude', latitude.toString());
        formData.append('user_selected_longitude', longitude.toString());
      } else if (latitude && longitude) {
        formData.append('device_latitude', latitude.toString());
        formData.append('device_longitude', longitude.toString());
        if (accuracy) formData.append('device_accuracy_m', accuracy.toString());
      }

      const receipt = await api.submitReport(formData);
      setSubmissionReceipt(receipt);
    } catch (err: any) {
      alert(`Report intake failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // 5. Reset
  const handleReset = () => {
    setSelectedFile(null);
    setImagePreviewUrl(null);
    setCaptureMode(null);
    setLatitude(null);
    setLongitude(null);
    setAccuracy(null);
    setLocationSource('unknown');
    setAddressLabel('');
    setGeoProofData(null);
    setSubmissionReceipt(null);
    setDescription('');
    setIsManualPin(false);
    setShowMapAdjust(false);
  };

  // Receipt screen after successful submission
  if (submissionReceipt) {
    return (
      <div className="max-w-xl mx-auto p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-6 text-center">
        <div className="w-16 h-16 rounded-full bg-brand-500/20 border-2 border-brand-500 flex items-center justify-center mx-auto text-brand-400">
          <CheckCircle2 className="w-10 h-10 animate-bounce" />
        </div>

        <div>
          <span className="text-xs uppercase font-bold text-brand-400 tracking-wider">
            Report Intake Confirmed
          </span>
          <h2 className="text-2xl font-bold text-white mt-1">
            Reference #{submissionReceipt.incident_number || submissionReceipt.report_number}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Processed through GeoProof AI evidence verification and indexed into the operational queue.
          </p>
        </div>

        {/* GeoProof Derivative Card */}
        {submissionReceipt.annotated_asset_url && (
          <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-2">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-2 font-semibold">
              Watermarked GeoProof Evidence Derivative
            </span>
            <img
              src={submissionReceipt.annotated_asset_url}
              alt="Watermarked"
              className="w-full max-h-64 object-contain rounded-lg"
            />
          </div>
        )}

        {/* Metadata Details */}
        <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 text-left text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-400">Defect Category:</span>
            <span className="text-slate-200 capitalize font-medium">{submissionReceipt.category.replace(/_/g, ' ')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Calculated Risk Score:</span>
            <span className="text-brand-300 font-bold">{submissionReceipt.risk_score.toFixed(1)} / 100</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Location Recorded:</span>
            <span className="text-slate-200 font-medium truncate max-w-[240px]">
              {submissionReceipt.readable_address || 'Location Pending'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Provenance:</span>
            <span className="text-teal-400">{submissionReceipt.location_source}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Intake SHA-256:</span>
            <span className="font-mono text-slate-500 text-[10px] truncate max-w-[200px]">
              {submissionReceipt.sha256}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => navigate(`/incidents/${submissionReceipt.incident_id}`)}
            className="flex-1 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow transition flex items-center justify-center gap-1.5"
          >
            <span>View Incident Dossier</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
          >
            Submit Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Public Defect Reporting Portal</h1>
        <p className="text-xs text-slate-400 mt-1">
          GeoProof AI associates verifiable location and time metadata with your photograph to create an actionable municipal incident.
        </p>
      </div>

      {/* Screen 1: Choose Photo Intake Method */}
      {!selectedFile ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Option A: Take a Photo */}
          <div
            onClick={() => cameraInputRef.current?.click()}
            className="group cursor-pointer bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-brand-500/50 p-6 rounded-2xl flex flex-col items-center justify-center text-center transition shadow-lg"
          >
            <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400 group-hover:scale-105 transition mb-4">
              <Camera className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-brand-300 transition">
              Take a Photo
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-[220px]">
              Use your device camera with live geolocation tagging.
            </p>
            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleFileChange(e.target.files[0], 'camera')}
            />
          </div>

          {/* Option B: Upload from Gallery */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="group cursor-pointer bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-brand-500/50 p-6 rounded-2xl flex flex-col items-center justify-center text-center transition shadow-lg"
          >
            <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 group-hover:scale-105 transition mb-4">
              <Upload className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-sky-300 transition">
              Upload from Gallery
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-[220px]">
              Extracts original EXIF GPS metadata if preserved in photo.
            </p>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleFileChange(e.target.files[0], 'gallery')}
            />
          </div>
        </div>
      ) : (
        /* Screen 2: Photo Selected, Metadata Analysis & Review */
        <form onSubmit={handleSubmitReport} className="space-y-5">
          {/* Image Preview Card */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Camera className="w-4 h-4 text-brand-400" />
                <span className="font-semibold">Selected Photograph</span>
                <span className="text-slate-500">({captureMode === 'camera' ? 'Camera Capture' : 'Gallery Upload'})</span>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 transition"
              >
                <X className="w-3.5 h-3.5" />
                <span>Replace</span>
              </button>
            </div>

            <div className="relative bg-slate-950 flex items-center justify-center p-2 max-h-[340px]">
              {imagePreviewUrl && (
                <img
                  src={imagePreviewUrl}
                  alt="Preview"
                  className="max-h-[320px] w-auto rounded-lg object-contain shadow"
                />
              )}
            </div>
          </div>

          {/* GeoProof Location Provenance & EXIF Card */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-brand-400" />
                <h3 className="text-sm font-semibold text-white">GeoProof AI Location Verification</h3>
              </div>
              {geoProofData && (
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                  geoProofData.evidence_quality === 'high' ? 'bg-emerald-950 text-emerald-300 border-emerald-800' :
                  geoProofData.evidence_quality === 'medium' ? 'bg-amber-950 text-amber-300 border-amber-800' :
                  'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {geoProofData.evidence_quality} Evidence Quality
                </span>
              )}
            </div>

            {analyzingMetadata ? (
              <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                <span>Reading EXIF GPS metadata and verifying location...</span>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Detected Location Status */}
                {latitude && longitude ? (
                  <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Detected Location:</span>
                      <ProvenanceTag source={locationSource as any} accuracy_m={accuracy} />
                    </div>
                    <p className="text-sm font-semibold text-slate-200">
                      {addressLabel || `${latitude.toFixed(5)}°, ${longitude.toFixed(5)}°`}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-850">
                      <span>Coordinates: {latitude.toFixed(5)}° N, {longitude.toFixed(5)}° E</span>
                      <button
                        type="button"
                        onClick={() => setShowMapAdjust(!showMapAdjust)}
                        className="text-brand-400 hover:text-brand-300 font-semibold underline"
                      >
                        {showMapAdjust ? 'Hide Map' : 'Adjust Pin on Map'}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* EXIF Missing Case: Guide User Gracefully */
                  <div className="p-4 bg-amber-950/30 rounded-lg border border-amber-800/40 text-xs space-y-3">
                    <div className="flex items-start gap-2 text-amber-300">
                      <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong>Photo EXIF GPS Not Embedded</strong>
                        <p className="text-amber-200/80 mt-0.5">
                          This image does not contain GPS tags (often stripped by social messaging apps or camera privacy settings).
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-900/50">
                      <button
                        type="button"
                        onClick={() => requestBrowserLocation('device_gps_at_submission')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow transition"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Use Current Device Location</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowMapAdjust(true)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
                      >
                        Select Map Pin
                      </button>
                    </div>

                    <p className="text-[10px] text-slate-400 italic">
                      Rule: If device location is granted, it will be transparently labeled as "Uploader location at submission" rather than claimed photo capture coordinates.
                    </p>
                  </div>
                )}

                {/* Map Pin Picker (shown when adjusting or missing GPS) */}
                {showMapAdjust && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Click anywhere on the map to set defect coordinates:</span>
                      <span className="text-brand-300 font-mono text-[11px]">
                        {latitude && longitude ? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` : 'Click to place pin'}
                      </span>
                    </div>
                    <div className="h-64 rounded-lg overflow-hidden border border-slate-700">
                      <MapComponent
                        interactiveSelection={true}
                        onSelectLocation={handleMapPinSelected}
                        selectedLocation={latitude && longitude ? { lat: latitude, lon: longitude } : null}
                        center={latitude && longitude ? [latitude, longitude] : [12.9716, 77.5946]}
                        zoom={13}
                        height="100%"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Description Input */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 space-y-2">
            <label className="text-xs font-semibold text-slate-200">
              Defect Description & Landmark Context (Optional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Deep pothole right at the bus stop exit. Water pooling inside crater causing two-wheelers to swerve."
              className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg p-3 focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Submission Button */}
          <button
            type="submit"
            disabled={submitting || analyzingMetadata}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-teal-500 hover:from-brand-500 hover:to-teal-400 text-white font-bold text-sm shadow-lg shadow-brand-600/30 transition flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Processing GeoProof Watermark & AI Triage...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Submit Infrastructure Incident</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
};

