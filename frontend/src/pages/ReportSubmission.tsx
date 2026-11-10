import React, { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Camera,
  Upload,
  MapPin,
  X,
  CheckCircle2,
  Info,
  Smartphone,
  ShieldCheck,
  ArrowRight,
  WifiOff,
  Save,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { GeoProofPreview } from '../types';
import { MapComponent } from '../components/MapComponent';
import { ProvenanceTag } from '../components/ProvenanceTag';
import { usePWA } from '../context/PWAContext';
import { fileToDataUrl, recordSubmittedIncidentNumber, saveOfflineDraft } from '../services/offlineDrafts';

export const ReportSubmission: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isOnline, refreshDrafts } = usePWA();
  const preferredMode = searchParams.get('mode');

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [captureMode, setCaptureMode] = useState<'camera' | 'gallery' | null>(null);

  const [analyzingMetadata, setAnalyzingMetadata] = useState(false);
  const [geoProofData, setGeoProofData] = useState<GeoProofPreview | null>(null);

  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [locationSource, setLocationSource] = useState<string>('unknown');
  const [addressLabel, setAddressLabel] = useState<string>('');
  const [isManualPin, setIsManualPin] = useState(false);
  const [showMapAdjust, setShowMapAdjust] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [draftSavedNotice, setDraftSavedNotice] = useState<string | null>(null);
  const [submissionReceipt, setSubmissionReceipt] = useState<any | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (file: File, mode: 'gallery' | 'camera') => {
    setErrorMsg(null);
    setDraftSavedNotice(null);
    setGeoError(null);
    setSelectedFile(file);
    setCaptureMode(mode);
    setImagePreviewUrl(URL.createObjectURL(file));

    if (!navigator.onLine) {
      if (mode === 'camera') {
        requestBrowserLocation('device_gps_at_capture');
      } else {
        setLocationSource('unknown');
      }
      return;
    }

    setAnalyzingMetadata(true);
    try {
      const preview = await api.precheckMetadata(file);
      setGeoProofData(preview);

      if (preview.exif_gps_found && preview.latitude && preview.longitude) {
        setLatitude(preview.latitude);
        setLongitude(preview.longitude);
        setLocationSource('photo_exif');
        setAddressLabel(preview.readable_address || 'Coordinates read from photo EXIF metadata');
      } else if (mode === 'camera') {
        requestBrowserLocation('device_gps_at_capture');
      } else {
        setLocationSource('unknown');
      }
    } catch {
      if (mode === 'camera') {
        requestBrowserLocation('device_gps_at_capture');
      }
    } finally {
      setAnalyzingMetadata(false);
    }
  };

  const requestBrowserLocation = (sourceType: 'device_gps_at_capture' | 'device_gps_at_submission') => {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError('Browser geolocation is unavailable on this device. Please select a location on the map.');
      setShowMapAdjust(true);
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
        setIsManualPin(false);

        if (navigator.onLine) {
          try {
            const rev = await api.reverseGeocode(lat, lon);
            setAddressLabel(rev.readable_address);
          } catch {
            setAddressLabel(`${lat.toFixed(4)}°, ${lon.toFixed(4)}° (Bengaluru)`);
          }
        } else {
          setAddressLabel(`${lat.toFixed(4)}°, ${lon.toFixed(4)}° (Offline GPS)`);
        }
      },
      (error) => {
        setGeoError(`Location permission unavailable (${error.message}). You can place a pin manually or submit with location pending.`);
        setShowMapAdjust(true);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleMapPinSelected = async (lat: number, lon: number) => {
    setLatitude(lat);
    setLongitude(lon);
    setAccuracy(15.0);
    setLocationSource('manual_map_pin');
    setIsManualPin(true);
    setGeoError(null);

    if (navigator.onLine) {
      try {
        const rev = await api.reverseGeocode(lat, lon);
        setAddressLabel(rev.readable_address);
      } catch {
        setAddressLabel(`${lat.toFixed(4)}°, ${lon.toFixed(4)}°`);
      }
    } else {
      setAddressLabel(`${lat.toFixed(4)}°, ${lon.toFixed(4)}°`);
    }
  };

  const handleSaveOfflineDraft = async () => {
    if (!selectedFile) return;
    setSavingDraft(true);
    setErrorMsg(null);
    try {
      const dataUrl = await fileToDataUrl(selectedFile);
      await saveOfflineDraft({
        fileName: selectedFile.name,
        mimeType: selectedFile.type || 'image/jpeg',
        imageDataUrl: dataUrl,
        captureMode: captureMode || 'gallery',
        description,
        latitude,
        longitude,
        accuracy,
        locationSource,
        isManualPin,
        addressLabel
      });
      await refreshDrafts();
      setDraftSavedNotice('Report saved locally as an offline draft. It will upload from "My Reports" when connected.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not save offline draft.');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    if (!navigator.onLine) {
      await handleSaveOfflineDraft();
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
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
      if (receipt?.incident_number) {
        recordSubmittedIncidentNumber(receipt.incident_number);
      }
      setSubmissionReceipt(receipt);
    } catch (err: any) {
      setErrorMsg(`Report submission failed: ${err.message}. You can save it as an offline draft below.`);
    } finally {
      setSubmitting(false);
    }
  };

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
    setErrorMsg(null);
    setGeoError(null);
    setDraftSavedNotice(null);
  };

  if (submissionReceipt) {
    return (
      <div className="max-w-xl mx-auto p-6 bg-white border border-[#DDE4EC] rounded-2xl shadow-sm space-y-5">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-[#39866A]">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <span className="text-xs uppercase font-bold text-[#167C80] tracking-wider block">
            Report Intake Confirmed
          </span>
          <h2 className="text-2xl font-bold text-[#263746]">
            Reference #{submissionReceipt.incident_number || submissionReceipt.report_number}
          </h2>
          <p className="text-xs text-[#5A6B7C]">
            Processed through GeoProof verification, pixel quality analysis, and duplicate screening.
          </p>
        </div>

        {submissionReceipt.annotated_asset_url && (
          <div className="rounded-xl overflow-hidden border border-[#DDE4EC] bg-[#F6F8FA] p-2.5">
            <span className="text-[11px] text-[#5A6B7C] uppercase tracking-wider block mb-2 font-semibold text-center">
              GeoProof Watermarked Derivative
            </span>
            <img
              src={submissionReceipt.annotated_asset_url}
              alt="Watermarked GeoProof"
              className="w-full max-h-64 object-contain rounded-lg mx-auto"
            />
          </div>
        )}

        <div className="bg-[#F6F8FA] p-4 rounded-xl border border-[#DDE4EC] text-xs space-y-2">
          <div className="flex justify-between gap-2">
            <span className="text-[#5A6B7C]">Detected Category:</span>
            <span className="text-[#263746] capitalize font-semibold">{submissionReceipt.category.replace(/_/g, ' ')}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[#5A6B7C]">Priority Score:</span>
            <span className="text-[#167C80] font-bold tabular-nums">{submissionReceipt.risk_score.toFixed(1)} / 100</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[#5A6B7C]">Location:</span>
            <span className="text-[#263746] font-medium text-right truncate max-w-[240px]">
              {submissionReceipt.readable_address || 'Location Pending'}
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[#5A6B7C]">Provenance:</span>
            <span className="text-[#3979B7] font-medium">{submissionReceipt.location_source}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[#5A6B7C]">Original SHA-256:</span>
            <span className="font-mono text-[#5A6B7C] text-[11px] truncate max-w-[180px]">
              {submissionReceipt.sha256}
            </span>
          </div>
        </div>

        {submissionReceipt.duplicate_candidate_found && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-[#9A6700]">
            <strong>Possible Duplicate Flagged:</strong> Correlated with {submissionReceipt.duplicate_candidate_id} ({submissionReceipt.duplicate_reason}). An operator will review consolidation.
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
          <button
            onClick={() => navigate(`/incidents/${submissionReceipt.incident_id}`)}
            className="flex-1 py-2.5 px-4 rounded-lg bg-[#167C80] hover:bg-[#116265] text-white text-xs font-semibold transition flex items-center justify-center gap-1.5"
          >
            <span>Open Incident Dossier</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2.5 rounded-lg bg-[#F6F8FA] hover:bg-slate-200/60 text-[#263746] border border-[#DDE4EC] text-xs font-medium transition"
          >
            Submit Another Report
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#263746] tracking-tight">Report a Road Issue</h1>
        <p className="text-xs sm:text-sm text-[#5A6B7C] mt-1">
          Capture a live photograph or select an existing image. GeoProof separates photo EXIF location from current uploader location.
        </p>
      </div>

      {!isOnline && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-[#9A6700] flex items-center gap-2.5">
          <WifiOff className="w-4 h-4 text-[#D99A32] flex-shrink-0" />
          <span>
            You are offline. You can capture a photograph and save it locally as a draft to sync when connectivity returns.
          </span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-[#DC4C4C] flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {draftSavedNotice && (
        <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-xs text-[#167C80] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span>{draftSavedNotice}</span>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/my-reports')}
              className="px-3 py-1.5 rounded-lg bg-[#167C80] text-white font-semibold"
            >
              View Drafts
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-lg bg-white border border-teal-200 text-[#167C80] font-medium"
            >
              New Report
            </button>
          </div>
        </div>
      )}

      {!selectedFile ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className={`text-center p-7 rounded-2xl border bg-white hover:bg-[#F6F8FA] transition flex flex-col items-center justify-center shadow-sm ${
              preferredMode === 'camera' ? 'border-[#167C80] ring-2 ring-[#167C80]/20' : 'border-[#DDE4EC]'
            }`}
          >
            <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#167C80] mb-4">
              <Camera className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-[#263746]">Take a Photo</h3>
            <p className="text-xs text-[#5A6B7C] mt-1 max-w-[220px]">
              Opens camera capture and requests current device GPS with accuracy metrics.
            </p>
            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0], 'camera')}
            />
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`text-center p-7 rounded-2xl border bg-white hover:bg-[#F6F8FA] transition flex flex-col items-center justify-center shadow-sm ${
              preferredMode === 'gallery' ? 'border-[#3979B7] ring-2 ring-[#3979B7]/20' : 'border-[#DDE4EC]'
            }`}
          >
            <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#3979B7] mb-4">
              <Upload className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-[#263746]">Upload from Gallery</h3>
            <p className="text-xs text-[#5A6B7C] mt-1 max-w-[220px]">
              Preserves original bytes and extracts embedded EXIF GPS &amp; capture time if present.
            </p>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0], 'gallery')}
            />
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmitReport} className="space-y-4">
          {/* Selected Photograph Preview */}
          <div className="bg-white rounded-xl border border-[#DDE4EC] overflow-hidden shadow-sm">
            <div className="p-3 border-b border-[#DDE4EC] flex items-center justify-between bg-[#F6F8FA]">
              <div className="flex items-center gap-2 text-xs text-[#263746]">
                <Camera className="w-4 h-4 text-[#167C80]" />
                <span className="font-semibold">Selected Photograph</span>
                <span className="text-[#5A6B7C]">({captureMode === 'camera' ? 'Camera' : 'Gallery'})</span>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-[#DC4C4C] hover:underline flex items-center gap-1 font-medium"
              >
                <X className="w-3.5 h-3.5" />
                <span>Replace</span>
              </button>
            </div>
            <div className="bg-slate-100 flex items-center justify-center p-3 max-h-[320px]">
              {imagePreviewUrl && (
                <img
                  src={imagePreviewUrl}
                  alt="Preview"
                  className="max-h-[290px] w-auto rounded-lg object-contain border border-[#DDE4EC]"
                />
              )}
            </div>
          </div>

          {/* GeoProof Location Provenance Card */}
          <div className="bg-white rounded-xl border border-[#DDE4EC] p-4 space-y-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#167C80]" />
                <h3 className="text-sm font-semibold text-[#263746]">Location Verification</h3>
              </div>
              {geoProofData && (
                <span className={`text-[11px] uppercase font-semibold px-2 py-0.5 rounded border ${
                  geoProofData.evidence_quality === 'high' ? 'bg-emerald-50 text-[#39866A] border-emerald-200' :
                  geoProofData.evidence_quality === 'medium' ? 'bg-amber-50 text-[#9A6700] border-amber-200' :
                  'bg-slate-100 text-[#5A6B7C] border-slate-200'
                }`}>
                  {geoProofData.evidence_quality} Metadata Quality
                </span>
              )}
            </div>

            {geoError && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-[#9A6700]">
                {geoError}
              </div>
            )}

            {analyzingMetadata ? (
              <div className="p-4 text-center text-xs text-[#5A6B7C] flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-[#167C80] border-t-transparent rounded-full animate-spin" />
                <span>Inspecting EXIF metadata and address...</span>
              </div>
            ) : (
              <div className="space-y-3">
                {latitude && longitude ? (
                  <div className="p-3 bg-[#F6F8FA] rounded-lg border border-[#DDE4EC] space-y-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[#5A6B7C] font-medium">Recorded Coordinates:</span>
                      <ProvenanceTag source={locationSource as any} accuracy_m={accuracy} />
                    </div>
                    <p className="text-sm font-semibold text-[#263746]">
                      {addressLabel || `${latitude.toFixed(5)}°, ${longitude.toFixed(5)}°`}
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#5A6B7C] pt-1.5 border-t border-[#DDE4EC]">
                      <span className="font-mono">{latitude.toFixed(5)}° N, {longitude.toFixed(5)}° E</span>
                      <button
                        type="button"
                        onClick={() => setShowMapAdjust(!showMapAdjust)}
                        className="text-[#167C80] font-semibold hover:underline"
                      >
                        {showMapAdjust ? 'Hide Map Picker' : 'Adjust Pin on Map'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50/70 rounded-lg border border-amber-200 text-xs space-y-3">
                    <div className="flex items-start gap-2 text-[#9A6700]">
                      <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong>Photo EXIF GPS Missing or Unavailable</strong>
                        <p className="mt-0.5">
                          You can share your current device location (recorded transparently as <em>Uploader location at submission</em>), drop a pin on the map, or submit with location pending.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => requestBrowserLocation('device_gps_at_submission')}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#167C80] hover:bg-[#116265] text-white text-xs font-semibold transition"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Use Current Device Location</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowMapAdjust(true)}
                        className="px-3 py-2 rounded-lg bg-white hover:bg-slate-100 text-[#263746] border border-[#DDE4EC] text-xs font-medium transition"
                      >
                        Place Map Pin
                      </button>
                    </div>
                  </div>
                )}

                {showMapAdjust && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs text-[#5A6B7C]">
                      <span>Tap the map to set defect location:</span>
                      <span className="font-mono text-[#167C80] text-[11px]">
                        {latitude && longitude ? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` : 'Tap to place pin'}
                      </span>
                    </div>
                    <div className="h-64 rounded-lg overflow-hidden">
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

          {/* Description */}
          <div className="bg-white rounded-xl border border-[#DDE4EC] p-4 space-y-2 shadow-sm">
            <label className="text-xs font-semibold text-[#263746] block">
              Defect Description &amp; Nearby Landmark (Optional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Deep pothole in left bus lane opposite Metro pillar 42, rainwater accumulating."
              className="w-full bg-[#F6F8FA] border border-[#DDE4EC] text-xs text-[#263746] rounded-lg p-3 focus:outline-none focus:border-[#167C80]"
            />
          </div>

          {/* Actions: Submit Online or Save Offline Draft */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              type="submit"
              disabled={submitting || analyzingMetadata || savingDraft}
              className="flex-1 py-3 px-4 rounded-xl bg-[#167C80] hover:bg-[#116265] disabled:opacity-60 text-white font-semibold text-sm shadow-sm transition flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing GeoProof &amp; Defect Analysis...</span>
                </>
              ) : !isOnline ? (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Draft Offline</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Submit Road Report</span>
                </>
              )}
            </button>

            {isOnline && (
              <button
                type="button"
                onClick={handleSaveOfflineDraft}
                disabled={submitting || savingDraft}
                className="px-4 py-3 rounded-xl bg-white hover:bg-[#F6F8FA] text-[#263746] border border-[#DDE4EC] text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <Save className="w-4 h-4 text-[#5A6B7C]" />
                <span>Save Draft</span>
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
};
