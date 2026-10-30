import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import {
  CareerStage,
  convertToUSD,
  FundingTier,
  GrantOpportunity,
  RegionScope,
} from '../data/grantData';

interface SpatialWorldMapProps {
  opportunities: GrantOpportunity[];
  onSelectOpportunity: (opp: GrantOpportunity) => void;
}

type SpecificFundingTier = Exclude<FundingTier, 'ALL'>;
type SpecificCareerStage = Exclude<CareerStage, 'ALL'>;

const FUNDING_TIER_OPTIONS: {
  id: SpecificFundingTier;
  label: string;
  shortRange: string;
}[] = [
  { id: 'TIER_1', label: 'Seed & Micro (< $25k)', shortRange: '< $25,000 USD' },
  { id: 'TIER_2', label: 'Mid-Scale ($25k – $100k)', shortRange: '$25k – $100k USD' },
  { id: 'TIER_3', label: 'Major Award (> $100k)', shortRange: '> $100,000 USD' },
];

const CAREER_STAGE_OPTIONS: {
  id: SpecificCareerStage;
  label: string;
  icon: string;
}[] = [
  { id: 'Youth <25', label: 'Youth (<25)', icon: 'fa-seedling' },
  { id: 'Early Career', label: 'Early Career', icon: 'fa-user-graduate' },
  { id: 'Mid-Career', label: 'Mid-Career', icon: 'fa-briefcase' },
  { id: 'Senior / All Ages', label: 'Senior / All Ages', icon: 'fa-award' },
];

const ALL_FUNDING_TIERS: SpecificFundingTier[] = ['TIER_1', 'TIER_2', 'TIER_3'];
const ALL_CAREER_STAGES: SpecificCareerStage[] = [
  'Youth <25',
  'Early Career',
  'Mid-Career',
  'Senior / All Ages',
];

const REGION_CENTERS: Record<RegionScope, { lat: number; lng: number; zoom: number }> = {
  ALL: { lat: 14.0, lng: 12.0, zoom: 2 },
  Global: { lat: 14.0, lng: 12.0, zoom: 2 },
  Africa: { lat: 4.5, lng: 18.5, zoom: 3 },
  'Latin America': { lat: -8.0, lng: -65.0, zoom: 3 },
  'Asia-Pacific': { lat: 18.0, lng: 96.0, zoom: 3 },
  'Middle East': { lat: 29.5, lng: 38.0, zoom: 4 },
  Europe: { lat: 49.5, lng: 11.0, zoom: 4 },
  'North America': { lat: 39.0, lng: -95.0, zoom: 3 },
};

function getOpportunityFundingTier(opp: GrantOpportunity): SpecificFundingTier {
  const usd = convertToUSD(opp.amount, opp.currency);
  if (usd < 25000) return 'TIER_1';
  if (usd <= 100000) return 'TIER_2';
  return 'TIER_3';
}

export const SpatialWorldMap: React.FC<SpatialWorldMapProps> = ({
  opportunities,
  onSelectOpportunity,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [selectedRegion, setSelectedRegion] = useState<RegionScope>('ALL');
  const [visibleTiers, setVisibleTiers] = useState<SpecificFundingTier[]>(ALL_FUNDING_TIERS);
  const [visibleStages, setVisibleStages] = useState<SpecificCareerStage[]>(ALL_CAREER_STAGES);
  const [activeOppId, setActiveOppId] = useState<string | null>(null);

  const toggleFundingTier = (tier: SpecificFundingTier) => {
    setVisibleTiers((prev) =>
      prev.includes(tier) ? prev.filter((item) => item !== tier) : [...prev, tier]
    );
  };

  const toggleCareerStage = (stage: SpecificCareerStage) => {
    setVisibleStages((prev) =>
      prev.includes(stage) ? prev.filter((item) => item !== stage) : [...prev, stage]
    );
  };

  const resetMapFilters = () => {
    setSelectedRegion('ALL');
    setVisibleTiers(ALL_FUNDING_TIERS);
    setVisibleStages(ALL_CAREER_STAGES);
    const map = mapInstanceRef.current;
    if (map) {
      map.flyTo([REGION_CENTERS.ALL.lat, REGION_CENTERS.ALL.lng], REGION_CENTERS.ALL.zoom, {
        duration: 0.8,
      });
    }
  };

  const filteredOpps = useMemo(() => {
    return opportunities.filter((opp) => {
      if (selectedRegion !== 'ALL' && opp.region !== selectedRegion) return false;
      const tier = getOpportunityFundingTier(opp);
      if (!visibleTiers.includes(tier)) return false;
      if (!visibleStages.includes(opp.stage)) return false;
      return true;
    });
  }, [opportunities, selectedRegion, visibleTiers, visibleStages]);

  const filteredUsdPool = useMemo(() => {
    return filteredOpps.reduce((sum, opp) => sum + convertToUSD(opp.amount, opp.currency), 0);
  }, [filteredOpps]);

  const hasCustomFilters =
    selectedRegion !== 'ALL' ||
    visibleTiers.length < ALL_FUNDING_TIERS.length ||
    visibleStages.length < ALL_CAREER_STAGES.length;

  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || mapInstanceRef.current) return;

    const map = L.map(container, {
      center: [14.0, 12.0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 12,
      worldCopyJump: true,
    });

    // Dark CartoDB Matter / OSM Dark style tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 18,
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    markersLayerRef.current = markersLayer;

    // Ensure proper Leaflet sizing after tab switch
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    filteredOpps.forEach((opp) => {
      const isUrgent = opp.status === 'Closing Soon';
      const pinColor = isUrgent ? '#facc15' : '#14b8a6';

      const customIcon = L.divIcon({
        className: 'custom-grant-pin',
        html: `<div style="
          width: 22px;
          height: 22px;
          border-radius: 9999px;
          background: ${pinColor};
          border: 2px solid #020617;
          box-shadow: 0 0 14px ${pinColor};
          display: flex;
          align-items: center;
          justify-content: center;
          color: #020617;
          font-weight: 800;
          font-size: 10px;
        ">$</div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      const marker = L.marker([opp.lat, opp.lng], { icon: customIcon });
      const popupContainer = document.createElement('div');
      popupContainer.className = 'space-y-2 text-xs min-w-[230px]';
      popupContainer.innerHTML = `
        <div class="text-[11px] text-teal-300 font-mono">${opp.region} · ${opp.locationLabel}</div>
        <div class="font-bold text-white text-sm leading-snug">${opp.title}</div>
        <div class="text-slate-400 text-[11px]">${opp.provider} · ${opp.stage}</div>
        <div class="flex items-center justify-between pt-1.5 border-t border-slate-800 font-mono">
          <span class="text-emerald-400 font-bold">${opp.currency} ${opp.amount.toLocaleString()}</span>
          <span class="text-slate-400 text-[11px]">Due ${opp.deadline}</span>
        </div>
        <div class="pt-2 flex items-center justify-between gap-2">
          <button type="button" data-action="details" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-semibold">Rubric & Details</button>
          <a href="${opp.url}" target="_blank" rel="noopener noreferrer" class="px-2.5 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded text-[11px] font-bold">Official Portal ↗</a>
        </div>
      `;

      const detailsBtn = popupContainer.querySelector('[data-action="details"]');
      if (detailsBtn) {
        detailsBtn.addEventListener('click', () => {
          onSelectOpportunity(opp);
        });
      }

      marker.bindPopup(popupContainer);
      marker.on('click', () => {
        setActiveOppId(opp.id);
      });
      marker.addTo(markersLayer);
    });
  }, [filteredOpps, onSelectOpportunity]);

  const handleRegionSelect = (region: RegionScope) => {
    setSelectedRegion(region);
    const map = mapInstanceRef.current;
    if (map) {
      const target = REGION_CENTERS[region] || REGION_CENTERS.ALL;
      map.flyTo([target.lat, target.lng], target.zoom, { duration: 0.9 });
    }
  };

  const focusOpportunityOnMap = (opp: GrantOpportunity) => {
    setActiveOppId(opp.id);
    const map = mapInstanceRef.current;
    if (map) {
      map.flyTo([opp.lat, opp.lng], 5, { duration: 0.8 });
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Region Quick-Jump Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <i className="fa-solid fa-earth-americas text-teal-400" />
            <span>Spatial World Map Navigation</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Explore surveyed opportunities pinned directly across developing regions, conflict-impacted hubs, and international research centers.
          </p>
        </div>

        {/* Region Quick-Jump Controls */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {(
            [
              'ALL',
              'Africa',
              'Latin America',
              'Middle East',
              'Asia-Pacific',
              'Europe',
              'Global',
            ] as RegionScope[]
          ).map((reg) => (
            <button
              key={reg}
              type="button"
              onClick={() => handleRegionSelect(reg)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition whitespace-nowrap shrink-0 ${
                selectedRegion === reg
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {reg === 'ALL' ? 'All Hubs' : reg}
            </button>
          ))}
        </div>
      </div>

      {/* SPATIAL MAP FILTER PANEL: FUNDING AMOUNT TIERS & CAREER STAGES */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3.5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-sliders text-teal-400 text-xs" />
            <span className="text-xs font-bold text-slate-200 tracking-wide">
              Map Visibility Filter Panel · Funding Tier &amp; Career Stage Toggles
            </span>
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span className="text-slate-400">
              Visible Pool:{' '}
              <strong className="text-emerald-400 tabular-nums">
                ${filteredUsdPool.toLocaleString()} USD
              </strong>{' '}
              ({filteredOpps.length} of {opportunities.length} pins)
            </span>
            {hasCustomFilters && (
              <button
                type="button"
                onClick={resetMapFilters}
                className="text-teal-400 hover:text-teal-300 font-sans font-semibold flex items-center gap-1"
              >
                <i className="fa-solid fa-rotate-left text-[10px]" />
                <span>Reset Map Filters</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Funding Amount Tier Toggles */}
          <div className="lg:col-span-6 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <i className="fa-solid fa-coins text-emerald-400 text-[10px]" />
                <span>Funding Amount Tier Visibility</span>
              </span>
              <button
                type="button"
                onClick={() =>
                  setVisibleTiers(
                    visibleTiers.length === ALL_FUNDING_TIERS.length ? [] : ALL_FUNDING_TIERS
                  )
                }
                className="text-teal-400 hover:text-teal-300 font-medium"
              >
                {visibleTiers.length === ALL_FUNDING_TIERS.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {FUNDING_TIER_OPTIONS.map((tier) => {
                const isActive = visibleTiers.includes(tier.id);
                const countInRegion = opportunities.filter(
                  (o) =>
                    (selectedRegion === 'ALL' || o.region === selectedRegion) &&
                    getOpportunityFundingTier(o) === tier.id
                ).length;

                return (
                  <button
                    key={tier.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => toggleFundingTier(tier.id)}
                    className={`px-3 py-2 rounded-xl border text-left transition flex items-center justify-between gap-2 ${
                      isActive
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-white'
                        : 'bg-slate-950/70 border-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-semibold truncate">
                        <i
                          className={`fa-solid ${
                            isActive
                              ? 'fa-eye text-emerald-400'
                              : 'fa-eye-slash text-slate-600'
                          } text-[10px]`}
                        />
                        <span className="truncate">{tier.shortRange}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">{tier.label}</div>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded tabular-nums shrink-0 ${
                        isActive
                          ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                          : 'bg-slate-900 text-slate-500'
                      }`}
                    >
                      {countInRegion}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Career Stage Toggles */}
          <div className="lg:col-span-6 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <i className="fa-solid fa-user-check text-teal-400 text-[10px]" />
                <span>Career Stage Visibility</span>
              </span>
              <button
                type="button"
                onClick={() =>
                  setVisibleStages(
                    visibleStages.length === ALL_CAREER_STAGES.length ? [] : ALL_CAREER_STAGES
                  )
                }
                className="text-teal-400 hover:text-teal-300 font-medium"
              >
                {visibleStages.length === ALL_CAREER_STAGES.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CAREER_STAGE_OPTIONS.map((stage) => {
                const isActive = visibleStages.includes(stage.id);
                const countInRegion = opportunities.filter(
                  (o) =>
                    (selectedRegion === 'ALL' || o.region === selectedRegion) &&
                    o.stage === stage.id
                ).length;

                return (
                  <button
                    key={stage.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => toggleCareerStage(stage.id)}
                    className={`px-2.5 py-2 rounded-xl border text-left transition flex items-center justify-between gap-1.5 ${
                      isActive
                        ? 'bg-teal-500/15 border-teal-500/50 text-white'
                        : 'bg-slate-950/70 border-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-semibold truncate">
                        <i
                          className={`fa-solid ${
                            isActive ? `${stage.icon} text-teal-400` : 'fa-eye-slash text-slate-600'
                          } text-[10px]`}
                        />
                        <span className="truncate">{stage.label}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {isActive ? 'Visible on map' : 'Hidden'}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded tabular-nums shrink-0 ${
                        isActive
                          ? 'bg-teal-500/20 text-teal-300 font-bold'
                          : 'bg-slate-900 text-slate-500'
                      }`}
                    >
                      {countInRegion}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Interactive Leaflet Map Viewport */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl relative">
          <div ref={mapContainerRef} className="w-full h-[540px] z-10" />
          <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-slate-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-400 inline-block" /> Open Call
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" /> Closing Soon (&lt;30d)
              </span>
            </div>
            <span>
              Showing {filteredOpps.length} of {opportunities.length} Verified Spatial Coordinates
            </span>
          </div>
        </div>

        {/* Spatial Directory Sidebar */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-[582px]">
          <div className="pb-3 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Pinned Hub Directory
            </h3>
            <span className="text-[11px] font-mono text-teal-400">{filteredOpps.length} Nodes</span>
          </div>

          <div className="mt-3 flex-grow overflow-y-auto space-y-2.5 pr-1">
            {filteredOpps.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <i className="fa-solid fa-filter-circle-xmark text-2xl text-slate-600" />
                <p className="text-xs font-semibold text-slate-300">
                  No regional hubs match the active funding tier and career stage toggles.
                </p>
                <p className="text-[11px] text-slate-400">
                  Toggle additional funding tiers or career stages above to reveal markers on the map.
                </p>
                <button
                  type="button"
                  onClick={resetMapFilters}
                  className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold transition"
                >
                  Restore All Map Layers
                </button>
              </div>
            ) : (
              filteredOpps.map((opp) => (
                <div
                  key={opp.id}
                  onClick={() => focusOpportunityOnMap(opp)}
                  className={`p-3 rounded-xl border transition cursor-pointer ${
                    activeOppId === opp.id
                      ? 'bg-slate-950 border-teal-500/60'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>{opp.locationLabel}</span>
                    <span className="text-emerald-400 font-bold tabular-nums">
                      {opp.currency} {opp.amount.toLocaleString()}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white mt-1 leading-snug">{opp.title}</h4>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                    <span className="truncate">{opp.provider}</span>
                    <span className="text-teal-300 font-mono shrink-0 ml-2">{opp.stage}</span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectOpportunity(opp);
                      }}
                      className="text-teal-400 hover:text-teal-300 font-semibold"
                    >
                      Inspect Rubric
                    </button>
                    <a
                      href={opp.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-slate-300 hover:text-white font-mono"
                    >
                      Official URL ↗
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

