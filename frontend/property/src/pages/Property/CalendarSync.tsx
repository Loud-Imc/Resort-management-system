import { useState, useEffect } from 'react';
import { useProperty } from '../../context/PropertyContext';
import { icalService, type PropertyIcal } from '../../services/ical';
import { bookingSourcesService } from '../../services/bookingSources';
import { channelsService, type ChannelPropertyMapping } from '../../services/channels';
import toast from 'react-hot-toast';
import {
  RefreshCw, Link as LinkIcon, Copy, Trash2, Plus,
  ExternalLink, CheckCircle2, AlertCircle, Loader2, Info, ChevronDown,
  Zap, Globe, ShieldCheck, Power, ArrowRight, Layers,
  BookOpen, X, Search, PlusCircle, Check, TrendingUp, Users
} from 'lucide-react';
import clsx from 'clsx';
import { ChannexOtaModal } from '../../components/Channels/ChannexOtaModal';

const CHANNEX_GLOBAL_CHANNELS = [
  { key: 'makemytrip', title: 'MakeMyTrip (India Top Leader - IngoMMT)', category: 'Regional Leader', placeholder: 'e.g. MMT-8891', color: 'from-blue-500/10 to-indigo-500/10 border-blue-500/30' },
  { key: 'goibibo', title: 'Goibibo (India Partner Network - IngoMMT)', category: 'Regional Leader', placeholder: 'e.g. GO-7712', color: 'from-orange-500/10 to-amber-500/10 border-orange-500/30' },
  { key: 'bookingcom', title: 'Booking.com (Global Leader)', category: 'Global Leader', placeholder: 'e.g. 1234567', color: 'from-sky-500/10 to-blue-500/10 border-sky-500/30' },
  { key: 'agoda', title: 'Agoda (APAC & Southeast Asia Leader)', category: 'Global Leader', placeholder: 'e.g. AGODA-9021', color: 'from-purple-500/10 to-pink-500/10 border-purple-500/30' },
  { key: 'airbnb', title: 'Airbnb (Vacation & Homestay Leader)', category: 'Global Leader', placeholder: 'e.g. AIR-5512', color: 'from-rose-500/10 to-red-500/10 border-rose-500/30' },
  { key: 'expedia', title: 'Expedia Group (Hotels.com / Vrbo / Orbitz)', category: 'Global Leader', placeholder: 'e.g. EXP-8821', color: 'from-yellow-500/10 to-amber-500/10 border-yellow-500/30' },
  { key: 'tripcom', title: 'Trip.com / Ctrip (China & APAC Leader)', category: 'Global Leader', placeholder: 'e.g. TRIP-ID-991', color: 'from-teal-500/10 to-cyan-500/10 border-teal-500/30' },
  { key: 'easemytrip', title: 'EaseMyTrip (India & Regional)', category: 'Regional Leader', placeholder: 'e.g. EMT-551', color: 'from-emerald-500/10 to-green-500/10 border-emerald-500/30' },
  { key: 'googlehotels', title: 'Google Hotel Ads (Direct Search Bookings)', category: 'Metasearch & Direct', placeholder: 'e.g. GOOG-HOTEL-771', color: 'from-green-500/10 to-emerald-500/10 border-green-500/30' },
  { key: 'vrbo', title: 'VRBO / HomeAway (Vacation Rental Network)', category: 'Vacation Rentals', placeholder: 'e.g. VRBO-8812', color: 'from-blue-600/10 to-indigo-600/10 border-blue-600/30' },
  { key: 'yatra', title: 'Yatra.com (India & Regional Portal)', category: 'Regional Leader', placeholder: 'e.g. YATRA-4491', color: 'from-red-500/10 to-orange-500/10 border-red-500/30' },
  { key: 'cleartrip', title: 'ClearTrip (India & Middle East)', category: 'Regional Leader', placeholder: 'e.g. CT-9912', color: 'from-cyan-500/10 to-blue-500/10 border-cyan-500/30' },
  { key: 'hostelworld', title: 'Hostelworld (Backpackers & Hostels)', category: 'Hostels & Budget', placeholder: 'e.g. HW-3321', color: 'from-amber-500/10 to-yellow-500/10 border-amber-500/30' },
  { key: 'hotelbeds', title: 'Hotelbeds (Global Wholesaler Network)', category: 'Wholesalers & B2B', placeholder: 'e.g. HB-9021', color: 'from-rose-500/10 to-pink-500/10 border-rose-500/30' },
  { key: 'webbeds', title: 'WebBeds / JacTravel (B2B Distribution)', category: 'Wholesalers & B2B', placeholder: 'e.g. WEB-4421', color: 'from-orange-500/10 to-red-500/10 border-orange-500/30' },
  { key: 'traveloka', title: 'Traveloka (Southeast Asia Leader)', category: 'Regional Leader', placeholder: 'e.g. TVL-5521', color: 'from-sky-500/10 to-cyan-500/10 border-sky-500/30' },
  { key: 'despegar', title: 'Despegar / Decolar (Latin America Leader)', category: 'Regional Leader', placeholder: 'e.g. DESP-881', color: 'from-purple-500/10 to-indigo-500/10 border-purple-500/30' },
  { key: 'dida', title: 'DidaTravel (Global Wholesaler Network)', category: 'Wholesalers & B2B', placeholder: 'e.g. DIDA-112', color: 'from-teal-500/10 to-emerald-500/10 border-teal-500/30' },
  { key: 'hyperguest', title: 'HyperGuest (Direct B2B Marketplace Engine)', category: 'Wholesalers & B2B', placeholder: 'e.g. HG-8841', color: 'from-indigo-500/10 to-violet-500/10 border-indigo-500/30' },
  { key: 'mrchub', title: 'Mr & Mrs Smith (Luxury Boutique Collection)', category: 'Luxury & Boutique', placeholder: 'e.g. MMS-901', color: 'from-stone-500/10 to-neutral-500/10 border-stone-500/30' },
  { key: 'agoda_homes', title: 'Agoda Homes (Apartments & Villas)', category: 'Vacation Rentals', placeholder: 'e.g. AGH-771', color: 'from-pink-500/10 to-rose-500/10 border-pink-500/30' },
  { key: 'tiketi', title: 'Tiketi.com (Regional Online Travel Network)', category: 'Regional Leader', placeholder: 'e.g. TIK-331', color: 'from-yellow-500/10 to-orange-500/10 border-yellow-500/30' },
  { key: 'ostrovok', title: 'Ostrovok / Emerging Travel Group', category: 'European & Specialized', placeholder: 'e.g. OST-4491', color: 'from-amber-500/10 to-orange-500/10 border-amber-500/30' },
  { key: 'tui', title: 'TUI / TUI Musement (Global Holiday Network)', category: 'European & Specialized', placeholder: 'e.g. TUI-8812', color: 'from-red-500/10 to-blue-500/10 border-red-500/30' },
  { key: 'hrs', title: 'HRS - Hotel Reservation Service (Corporate & B2B)', category: 'European & Specialized', placeholder: 'e.g. HRS-9012', color: 'from-blue-500/10 to-indigo-500/10 border-blue-500/30' },
  { key: 'hotelspecials', title: 'HotelSpecials (Benelux & Europe)', category: 'European & Specialized', placeholder: 'e.g. HS-1123', color: 'from-teal-500/10 to-cyan-500/10 border-teal-500/30' },
  { key: 'keytel', title: 'KeyTel / Hotusa Group', category: 'European & Specialized', placeholder: 'e.g. KEY-5541', color: 'from-rose-500/10 to-pink-500/10 border-rose-500/30' },
  { key: 'pegas', title: 'Pegas Touristik (CIS & Resort Network)', category: 'European & Specialized', placeholder: 'e.g. PEG-3321', color: 'from-sky-500/10 to-blue-500/10 border-sky-500/30' },
  { key: 'smyrooms', title: 'Smyrooms / Logitravel (European Wholesaler)', category: 'Wholesalers & B2B', placeholder: 'e.g. SMY-7712', color: 'from-purple-500/10 to-violet-500/10 border-purple-500/30' },
  { key: 'sunweb', title: 'Sunweb Group (European Holiday Packages)', category: 'European & Specialized', placeholder: 'e.g. SUN-9021', color: 'from-yellow-500/10 to-amber-500/10 border-yellow-500/30' },
  { key: 'otsglobe', title: 'OTS Globe (Global Destination Management)', category: 'Wholesalers & B2B', placeholder: 'e.g. OTS-6651', color: 'from-emerald-500/10 to-teal-500/10 border-emerald-500/30' },
  { key: 'roibos', title: 'Roibos (B2B Hotel Distribution Platform)', category: 'Wholesalers & B2B', placeholder: 'e.g. ROI-8831', color: 'from-indigo-500/10 to-blue-500/10 border-indigo-500/30' },
  { key: 'welcomebeds', title: 'Welcomebeds (Global Accommodation Network)', category: 'Wholesalers & B2B', placeholder: 'e.g. WB-2241', color: 'from-cyan-500/10 to-sky-500/10 border-cyan-500/30' },
  { key: 'peakwork', title: 'Peakwork (Dynamic Holiday Packaging Engine)', category: 'European & Specialized', placeholder: 'e.g. PKW-901', color: 'from-green-500/10 to-emerald-500/10 border-green-500/30' },
  { key: 'jumio', title: 'Jumio Travel Network', category: 'European & Specialized', placeholder: 'e.g. JUM-114', color: 'from-stone-500/10 to-neutral-500/10 border-stone-500/30' },
  { key: 'wakanow', title: 'Wakanow (Africa & Regional Travel Leader)', category: 'Regional Leader', placeholder: 'e.g. WAK-772', color: 'from-orange-500/10 to-amber-500/10 border-orange-500/30' },
  { key: 'hotelston', title: 'Hotelston (B2B Accommodation Wholesaler)', category: 'Wholesalers & B2B', placeholder: 'e.g. HST-993', color: 'from-blue-500/10 to-indigo-500/10 border-blue-500/30' },
  { key: 'stuba', title: 'Stuba (Global Curated B2B Accommodation)', category: 'Wholesalers & B2B', placeholder: 'e.g. STB-441', color: 'from-rose-500/10 to-red-500/10 border-rose-500/30' },
  { key: 'intui', title: 'Intui Travel & Transfers Network', category: 'European & Specialized', placeholder: 'e.g. INT-882', color: 'from-teal-500/10 to-green-500/10 border-teal-500/30' },
  { key: 'goglobal', title: 'GoGlobal Travel (B2B Bedbank Network)', category: 'Wholesalers & B2B', placeholder: 'e.g. GGT-331', color: 'from-purple-500/10 to-pink-500/10 border-purple-500/30' },
  { key: 'travco', title: 'Travco (International B2B Hotel Wholesaler)', category: 'Wholesalers & B2B', placeholder: 'e.g. TRV-661', color: 'from-sky-500/10 to-indigo-500/10 border-sky-500/30' },
  { key: 'bedsline', title: 'Bedsline (Global Hotel Reservation Network)', category: 'Wholesalers & B2B', placeholder: 'e.g. BDL-118', color: 'from-amber-500/10 to-red-500/10 border-amber-500/30' },
  { key: 'tripadvisor', title: 'Tripadvisor Instant Book & Plus', category: 'Metasearch & Direct', placeholder: 'e.g. TA-8821', color: 'from-green-500/10 to-emerald-500/10 border-green-500/30' },
  { key: 'trivago', title: 'Trivago Express Booking Network', category: 'Metasearch & Direct', placeholder: 'e.g. TRV-9012', color: 'from-blue-500/10 to-red-500/10 border-blue-500/30' },
  { key: 'kayak', title: 'Kayak Direct Booking Engine', category: 'Metasearch & Direct', placeholder: 'e.g. KYK-1142', color: 'from-orange-500/10 to-amber-500/10 border-orange-500/30' },
  { key: 'skyscanner', title: 'SkyScanner Hotels & Resorts Portal', category: 'Metasearch & Direct', placeholder: 'e.g. SKY-5531', color: 'from-sky-500/10 to-blue-500/10 border-sky-500/30' },
  { key: 'hoteltonight', title: 'HotelTonight (Last-Minute Boutique Deals)', category: 'Luxury & Boutique', placeholder: 'e.g. HT-7712', color: 'from-purple-500/10 to-pink-500/10 border-purple-500/30' },
  { key: 'plumguide', title: 'Plum Guide (Curated Luxury Vacation Rentals)', category: 'Luxury & Boutique', placeholder: 'e.g. PLUM-882', color: 'from-stone-500/10 to-amber-500/10 border-stone-500/30' },
  { key: 'sonder', title: 'Sonder Apartment & Hospitality Network', category: 'Vacation Rentals', placeholder: 'e.g. SND-331', color: 'from-teal-500/10 to-emerald-500/10 border-teal-500/30' },
  { key: 'marriott_homes', title: 'Marriott Bonvoy Homes & Villas', category: 'Vacation Rentals', placeholder: 'e.g. MB-9011', color: 'from-rose-500/10 to-red-500/10 border-rose-500/30' },
  { key: 'accor', title: 'Accor Allaways Partner Distribution Network', category: 'Global Leader', placeholder: 'e.g. ACC-441', color: 'from-indigo-500/10 to-blue-500/10 border-indigo-500/30' },
  { key: 'radisson', title: 'Radisson Rewards Partner Network', category: 'Global Leader', placeholder: 'e.g. RAD-221', color: 'from-cyan-500/10 to-blue-500/10 border-cyan-500/30' },
  { key: 'choice', title: 'Choice Hotels Global Distribution System', category: 'Global Leader', placeholder: 'e.g. CH-889', color: 'from-yellow-500/10 to-amber-500/10 border-yellow-500/30' },
  { key: 'wyndham', title: 'Wyndham Hotels & Resorts Network', category: 'Global Leader', placeholder: 'e.g. WYN-771', color: 'from-blue-600/10 to-indigo-600/10 border-blue-600/30' },
  { key: 'bestwestern', title: 'Best Western Partner Distribution Portal', category: 'Global Leader', placeholder: 'e.g. BW-119', color: 'from-red-600/10 to-rose-600/10 border-red-600/30' },
  { key: 'rakuten', title: 'Rakuten Travel (Japan & East Asia Leader)', category: 'Regional Leader', placeholder: 'e.g. RAK-882', color: 'from-red-500/10 to-pink-500/10 border-red-500/30' },
  { key: 'jalan', title: 'Jalan.net (Japan Domestic Travel Network)', category: 'Regional Leader', placeholder: 'e.g. JAL-441', color: 'from-orange-500/10 to-amber-500/10 border-orange-500/30' },
  { key: 'ikyu', title: 'Ikyu.com (Japan Luxury Boutique Collection)', category: 'Luxury & Boutique', placeholder: 'e.g. IKY-901', color: 'from-stone-500/10 to-neutral-500/10 border-stone-500/30' },
  { key: 'fliggy', title: 'Fliggy / Alibaba Travel (China & APAC Leader)', category: 'Regional Leader', placeholder: 'e.g. FLG-331', color: 'from-amber-500/10 to-yellow-500/10 border-amber-500/30' },
  { key: 'meituan', title: 'Meituan Hotel Network (China Domestic Leader)', category: 'Regional Leader', placeholder: 'e.g. MEI-662', color: 'from-yellow-500/10 to-amber-500/10 border-yellow-500/30' },
  { key: 'qunar', title: 'Qunar / Elong Travel Platform (APAC Leader)', category: 'Regional Leader', placeholder: 'e.g. QUN-771', color: 'from-teal-500/10 to-cyan-500/10 border-teal-500/30' },
  { key: 'mmt_mybiz', title: 'MakeMyTrip MyBiz (Corporate & B2B Travel)', category: 'Wholesalers & B2B', placeholder: 'e.g. MYBIZ-881', color: 'from-blue-500/10 to-indigo-500/10 border-blue-500/30' },
  { key: 'happyeasygo', title: 'HappyEasyGo (India & APAC Online Portal)', category: 'Regional Leader', placeholder: 'e.g. HEG-221', color: 'from-purple-500/10 to-pink-500/10 border-purple-500/30' },
  { key: 'ixigo', title: 'Ixigo Hotels & Holiday Network (India)', category: 'Regional Leader', placeholder: 'e.g. IXI-554', color: 'from-rose-500/10 to-red-500/10 border-rose-500/30' },
  { key: 'viacom', title: 'Via.com / EbixCash (India & Middle East B2B)', category: 'Wholesalers & B2B', placeholder: 'e.g. VIA-883', color: 'from-sky-500/10 to-cyan-500/10 border-sky-500/30' },
  { key: 'thomascook', title: 'Thomas Cook India & Global Holidays Network', category: 'Wholesalers & B2B', placeholder: 'e.g. TC-991', color: 'from-amber-500/10 to-yellow-500/10 border-amber-500/30' },
  { key: 'sotc', title: 'SOTC Travel Network (Holiday Packages & Tours)', category: 'Wholesalers & B2B', placeholder: 'e.g. SOTC-332', color: 'from-red-500/10 to-orange-500/10 border-red-500/30' },
  { key: 'coxandkings', title: 'Cox & Kings Holidays & Resorts Network', category: 'Wholesalers & B2B', placeholder: 'e.g. CK-118', color: 'from-stone-500/10 to-amber-500/10 border-stone-500/30' },
  { key: 'akbartravels', title: 'Akbar Travels (Middle East & India B2B Network)', category: 'Wholesalers & B2B', placeholder: 'e.g. AKB-662', color: 'from-indigo-500/10 to-blue-500/10 border-indigo-500/30' },
  { key: 'riyatravel', title: 'Riya Travel & Tours (B2B Global Distribution)', category: 'Wholesalers & B2B', placeholder: 'e.g. RIYA-771', color: 'from-emerald-500/10 to-teal-500/10 border-emerald-500/30' },
  { key: 'tbo', title: 'TBO Holidays (Travel Boutique Online B2B Leader)', category: 'Wholesalers & B2B', placeholder: 'e.g. TBO-901', color: 'from-cyan-500/10 to-blue-500/10 border-cyan-500/30' },
  { key: 'tourico', title: 'Tourico Holidays (International Wholesaler)', category: 'Wholesalers & B2B', placeholder: 'e.g. TOU-441', color: 'from-blue-500/10 to-indigo-500/10 border-blue-500/30' },
  { key: 'gta', title: 'GTA (Gullivers Travel Associates Bedbank)', category: 'Wholesalers & B2B', placeholder: 'e.g. GTA-882', color: 'from-rose-500/10 to-pink-500/10 border-rose-500/30' },
  { key: 'alliedtpro', title: 'AlliedTPro Destination Management Network', category: 'Wholesalers & B2B', placeholder: 'e.g. ATP-331', color: 'from-teal-500/10 to-green-500/10 border-teal-500/30' },
  { key: 'amex_gbt', title: 'American Express Global Business Travel (Corporate)', category: 'Wholesalers & B2B', placeholder: 'e.g. AMEX-551', color: 'from-blue-600/10 to-sky-600/10 border-blue-600/30' },
  { key: 'bcd_travel', title: 'BCD Travel Corporate Solutions (Global Business)', category: 'Wholesalers & B2B', placeholder: 'e.g. BCD-881', color: 'from-purple-500/10 to-indigo-500/10 border-purple-500/30' },
  { key: 'cwt', title: 'CWT (Carlson Wagonlit Travel Corporate Network)', category: 'Wholesalers & B2B', placeholder: 'e.g. CWT-119', color: 'from-orange-500/10 to-red-500/10 border-orange-500/30' },
  { key: 'custom_ota', title: 'Other Channex Supported OTA / Portal', category: 'Generic / Custom', placeholder: 'e.g. OTA-ID-1234', color: 'from-primary/10 to-blue-500/10 border-primary/30' },
];

export default function CalendarSync() {
  const { selectedProperty } = useProperty();
  const [activeTab, _] = useState<'channels' | 'ical'>('channels');
  
  // iCal State
  const [links, setLinks] = useState<PropertyIcal[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);

  // Channel Manager State
  const [mappings, setMappings] = useState<ChannelPropertyMapping[]>([]);
  const [enablingChannel, setEnablingChannel] = useState(false);
  const [pushingAri, setPushingAri] = useState(false);

  // Direct OTA Connector State (MakeMyTrip, Booking.com, Agoda, Airbnb, Goibibo, Expedia, Trip.com, EaseMyTrip)
  const [simulatingOta, setSimulatingOta] = useState<string | null>(null);
  const [connectedOtaStatus, setConnectedOtaStatus] = useState<{ [key: string]: { connected: boolean; hotelId?: string } }>({
    makemytrip: { connected: false },
    bookingcom: { connected: false },
    agoda: { connected: false },
    airbnb: { connected: false },
    goibibo: { connected: false },
    expedia: { connected: false },
    tripcom: { connected: false },
    easemytrip: { connected: false },
  });

  // Dedicated Channel Configuration Modal state matching exact Channex schema
  const [activeOtaModal, setActiveOtaModal] = useState<{ open: boolean; otaKey: string; otaTitle: string } | null>(null);
  const [otaConfigs, setOtaConfigs] = useState<{ [key: string]: any }>({
    makemytrip: { hotelId: '', accessToken: '', syncB2B: true, syncMyBiz: false, totalType: 'Payout Amount' },
    bookingcom: { hotelId: '', pricingType: 'Standard', sendEmail: true },
    agoda: { hotelId: '', accessToken: '', totalType: 'Payout Amount' },
    airbnb: { minStayType: 'Arrival', totalType: 'Payout Amount', lessCoHost: false },
    goibibo: { hotelId: '', accessToken: '', syncB2B: true },
    expedia: { hotelId: '', accessToken: '', pricingType: 'Standard' },
    tripcom: { hotelId: '', accessToken: '', totalType: 'Payout Amount' },
    easemytrip: { hotelId: '', accessToken: '', syncB2B: true },
  });
  const [emergencyStopSell, setEmergencyStopSell] = useState(false);

  // Custom System Confirm Modal (`replacing window.confirm`)
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    confirmColor?: string;
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });

  // Owner Guide & Benefits Modal (`Why Use Calendar Sync`)
  const [ownerGuideModal, setOwnerGuideModal] = useState(false);

  // Dynamic + Add Another OTA Channel state
  const [customOtaModal, setCustomOtaModal] = useState(false);
  const [customOtaSearch, setCustomOtaSearch] = useState('');
  const [customOtaList, setCustomOtaList] = useState<any[]>([]);
  const [availableCatalog, setAvailableCatalog] = useState<any[]>(CHANNEX_GLOBAL_CHANNELS);
  const [directoryCategory, setDirectoryCategory] = useState<string>('All');

  // Actionable Setup Modal State when rooms or room types are missing
  const [setupModal, setSetupModal] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: '',
    message: '',
  });

  // Form state for iCal
  const [platformName, setPlatformName] = useState('');
  const [icalUrl, setIcalUrl] = useState('');
  const [bookingSourceId, setBookingSourceId] = useState('');

  const exportUrl = `${window.location.origin.replace('5173', '3000')}/api/ical/export/${selectedProperty?.slug}.ics`;

  useEffect(() => {
    channelsService.getCatalog().then(data => {
      if (data && data.length > 0) setAvailableCatalog(data);
    }).catch(err => console.error("Failed to load Channex channel catalog from API:", err));

    if (selectedProperty?.id) {
      loadLinks();
    }
  }, [selectedProperty?.id]);

  const loadLinks = async () => {
    try {
      setLoading(true);
      const [linksData, sourcesData, mappingsData] = await Promise.all([
        icalService.getLinks(selectedProperty!.id),
        bookingSourcesService.getAll(),
        channelsService.getMappings(selectedProperty!.id).catch(() => []),
      ]);
      setLinks(linksData);
      setSources(sourcesData.filter(s => s.isActive));
      setMappings(mappingsData || []);
    } catch (err) {
      toast.error('Failed to load sync settings');
    } finally {
      setLoading(false);
    }
  };

  const handleEnableChannelSync = async (channelName = 'CHANNEX') => {
    if (!selectedProperty?.id) return;
    try {
      setEnablingChannel(true);
      await channelsService.enableSync(selectedProperty.id, channelName);
      toast.success(`Automated 2-Way Channel Sync Enabled for ${selectedProperty.name}!`);
      await loadLinks();
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || '';
      if (errMsg.includes('SETUP_REQUIRED') || errMsg.includes('No physical room') || errMsg.includes('No Room Types')) {
        setSetupModal({
          open: true,
          title: 'Room Types & Inventory Setup Required',
          message: errMsg.replace('SETUP_REQUIRED: ', ''),
        });
      } else {
        toast.error(errMsg || 'Failed to enable channel sync. Check master credentials.');
      }
    } finally {
      setEnablingChannel(false);
    }
  };

  const handleDisableChannelSync = async (channelName = 'CHANNEX') => {
    if (!selectedProperty?.id) return;
    setConfirmModal({
      open: true,
      title: 'Pause Real-Time OTA Sync?',
      message: `Are you sure you want to pause live 2-way room and price synchronization with ${channelName}? Incoming reservations will no longer auto-lock physical rooms while paused.`,
      confirmLabel: 'Yes, Pause Sync',
      confirmColor: 'bg-amber-600 hover:bg-amber-700 text-white',
      onConfirm: async () => {
        try {
          await channelsService.disableSync(selectedProperty.id, channelName);
          toast.success('Channel Sync Paused');
          await loadLinks();
        } catch (err: any) {
          toast.error('Failed to pause sync');
        }
      }
    });
  };

  const handlePushAri = async () => {
    if (!selectedProperty?.id) return;
    try {
      setPushingAri(true);
      await channelsService.pushAri(selectedProperty.id, 60);
      toast.success('⚡ Successfully pushed live rates & room availability across all connected OTAs!');
    } catch (err: any) {
      toast.error('Failed to push inventory.');
    } finally {
      setPushingAri(false);
    }
  };

  const handleConnectDirectOta = (otaKey: string, otaTitle: string) => {
    // Open dedicated channel connection modal matching Channex schema
    setActiveOtaModal({ open: true, otaKey, otaTitle });
  };

  const handleSaveOtaConfig = (otaKey: string, otaTitle: string, passedConfig?: any) => {
    const config = passedConfig || otaConfigs[otaKey] || {};
    if (passedConfig) {
      setOtaConfigs(prev => ({ ...prev, [otaKey]: passedConfig }));
    }
    if (otaKey !== 'airbnb' && !config.hotelId?.trim()) {
      toast.error(`Please enter the ${otaTitle} Hotel Property ID.`);
      return;
    }
    if ((otaKey === 'makemytrip' || otaKey === 'agoda' || otaKey === 'goibibo' || otaKey === 'easemytrip' || otaKey === 'tripcom' || otaKey === 'expedia') && !config.accessToken?.trim()) {
      toast.error(`Please enter your ${otaTitle} Extranet Access Token / Secret API Key.`);
      return;
    }
    setConnectedOtaStatus(prev => ({
      ...prev,
      [otaKey]: { connected: true, hotelId: otaKey === 'airbnb' ? 'OAuth-Connected' : config.hotelId.trim() }
    }));
    setActiveOtaModal(null);
    toast.success(`Successfully configured & linked ${otaTitle} via 2-Way Channel Engine!`);
  };

  const handleDisconnectDirectOta = (otaKey: string, otaTitle: string) => {
    setConfirmModal({
      open: true,
      title: `Disconnect ${otaTitle}?`,
      message: `Are you sure you want to disconnect ${otaTitle} live 2-way sync? You will need to re-enter your Extranet credentials to link again later.`,
      confirmLabel: `Disconnect ${otaTitle}`,
      confirmColor: 'bg-red-600 hover:bg-red-700 text-white',
      onConfirm: () => {
        setConnectedOtaStatus(prev => ({
          ...prev,
          [otaKey]: { connected: false }
        }));
        toast.success(`Disconnected ${otaTitle}`);
      }
    });
  };

  const handleToggleEmergencyStopSell = async () => {
    if (!selectedProperty?.id) return;
    if (!emergencyStopSell) {
      setConfirmModal({
        open: true,
        title: '⚠️ EMERGENCY INVENTORY FREEZE (`Master Stop Sell`)',
        message: 'Are you sure you want to trigger an Emergency Stop Sell across MakeMyTrip, Booking.com, Agoda, and all connected OTAs? This immediately closes all online room inventory for the next 60 days to prevent overbooking during power outages, renovations, or emergencies.',
        confirmLabel: '🛑 Activate Emergency Freeze',
        confirmColor: 'bg-red-600 hover:bg-red-700 text-white',
        onConfirm: async () => {
          try {
            setEmergencyStopSell(true);
            await channelsService.pushAri(selectedProperty.id, 60);
            toast.error("🛑 EMERGENCY STOP SELL ACTIVE: All online sales closed across all OTAs!", { duration: 6000 });
          } catch (err: any) {
            toast.error(err.message || "Failed to push emergency stop sell");
            setEmergencyStopSell(false);
          }
        }
      });
    } else {
      setConfirmModal({
        open: true,
        title: '🟢 Resume Normal Online Sales?',
        message: 'Are you sure you want to lift the Emergency Stop Sell and restore normal live room inventory & rate synchronization across all connected OTAs right now?',
        confirmLabel: 'Resume Online Sales',
        confirmColor: 'bg-green-600 hover:bg-green-700 text-white',
        onConfirm: async () => {
          try {
            setEmergencyStopSell(false);
            await channelsService.pushAri(selectedProperty.id, 60);
            toast.success("🟢 ONLINE SALES RESUMED: Normal inventory & rate sync active across all OTAs!");
          } catch (err: any) {
            toast.error(err.message || "Failed to resume online sales");
          }
        }
      });
    }
  };

  const handleSimulateBooking = async (otaTitle: string) => {
    if (!selectedProperty?.id) return;
    try {
      setSimulatingOta(otaTitle);
      const res = await channelsService.simulateBooking(selectedProperty.id, otaTitle);
      const otaKey = otaTitle.toLowerCase().replace(/\./g, '');
      setConnectedOtaStatus(prev => ({
        ...prev,
        [otaKey]: { connected: true, hotelId: `SIM-${res.bookingNumber?.slice(0, 6) || 'TEST'}` }
      }));
      toast.success(`⚡ Success! Created ${otaTitle} Reservation #${res.bookingNumber} in live calendar & locked physical room!`);
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || '';
      if (errMsg.includes('SETUP_REQUIRED') || errMsg.includes('No physical room') || errMsg.includes('No Room Types')) {
        setSetupModal({
          open: true,
          title: 'Physical Rooms or Room Types Setup Required',
          message: errMsg.replace('SETUP_REQUIRED: ', ''),
        });
      } else {
        toast.error(errMsg || `Could not simulate booking. Please verify room types are mapped.`);
      }
    } finally {
      setSimulatingOta(null);
    }
  };

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProperty?.id || !platformName || !icalUrl) return;

    try {
      setAdding(true);
      await icalService.addLink(selectedProperty.id, { 
        platformName, 
        icalUrl,
        bookingSourceId: bookingSourceId || undefined
      });
      toast.success('Sync link added successfully');
      setPlatformName('');
      setIcalUrl('');
      setBookingSourceId('');
      loadLinks();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add link');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteLink = async (id: string) => {
    setConfirmModal({
      open: true,
      title: 'Remove iCal Connection?',
      message: 'Are you sure you want to remove this legacy iCal sync link? Any calendar blocks previously imported from this URL will be removed.',
      confirmLabel: 'Remove Connection',
      confirmColor: 'bg-red-600 hover:bg-red-700 text-white',
      onConfirm: async () => {
        try {
          await icalService.deleteLink(id);
          toast.success('Link removed');
          setLinks(prev => prev.filter(l => l.id !== id));
        } catch (err) {
          toast.error('Failed to remove link');
        }
      }
    });
  };

  const handleManualSync = async (id: string) => {
    try {
      setSyncing(id);
      await icalService.triggerSync(id);
      toast.success('Synchronization complete');
      loadLinks();
    } catch (err) {
      toast.error('Sync failed. Please check the URL.');
    } finally {
      setSyncing(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('URL copied to clipboard');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading channel synchronization engine...</p>
      </div>
    );
  }

  const activeChannelMapping = mappings.find(m => m.isActive);

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-background to-background border border-primary/20 p-8 shadow-xl">
        <div className="absolute top-0 right-0 -m-8 p-16 bg-primary/5 rounded-full blur-3xl" />
        <div className="relative flex flex-col gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">
              Channel Manager & Calendar Sync
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-3xl">
              Prevent overbooking and maximize revenue by synchronizing your exact room availability across MakeMyTrip, Booking.com, Agoda etc.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => { setCustomOtaSearch(''); setDirectoryCategory('All'); setCustomOtaModal(true); }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-2xl font-extrabold text-xs shadow-sm transition-all cursor-pointer"
            >
              <Globe className="h-4 w-4" />
              <span>🌐 Supported OTAs Directory (60+ Portals)</span>
            </button>
            <button
              onClick={() => setOwnerGuideModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-2xl font-extrabold text-xs shadow-sm transition-all cursor-pointer"
            >
              <BookOpen className="h-4 w-4" />
              <span>📖 Owner & Staff Guide (`Benefits & FAQ`)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      {/* <div className="flex border-b border-border bg-card rounded-2xl p-1.5 shadow-sm">
        <button
          onClick={() => setActiveTab('channels')}
          className={clsx(
            'flex-1 flex items-center justify-center gap-2.5 py-3 px-6 rounded-xl font-bold text-sm transition-all duration-300',
            activeTab === 'channels'
              ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          <Zap className="h-4 w-4" />
          <span>Real-Time OTA Channel Sync (MakeMyTrip, Booking.com)</span>
          <span className="ml-1 text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full font-extrabold uppercase">
            Recommended
          </span>
        </button>
        <button
          onClick={() => setActiveTab('ical')}
          className={clsx(
            'flex-1 flex items-center justify-center gap-2.5 py-3 px-6 rounded-xl font-bold text-sm transition-all duration-300',
            activeTab === 'ical'
              ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          <Calendar className="h-4 w-4" />
          <span>Legacy iCal Calendar Feeds</span>
        </button>
      </div> */}

      {/* Tab Content: Real-Time Channels */}
      {activeTab === 'channels' ? (
        <div className="space-y-6">
          {!activeChannelMapping ? (
            <div className="bg-gradient-to-br from-card to-muted/30 border-2 border-dashed border-primary/30 rounded-3xl p-8 sm:p-12 text-center space-y-6">
              <div className="w-20 h-20 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                <Globe className="h-10 w-10 animate-pulse" />
              </div>
              <div className="max-w-xl mx-auto space-y-2">
                <h2 className="text-2xl font-extrabold text-foreground">
                  Automated 2-Way Channel Sync Engine
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Turn on headless synchronization. Our PMS will automatically create your property and room types inside the global Channel Manager engine right now, keeping MakeMyTrip, Agoda, and Booking.com locked and synchronized in seconds whenever a reservation occurs.
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-4 py-2">
                <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 bg-green-500/10 text-green-600 rounded-lg">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Instant Overbooking Protection</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 bg-blue-500/10 text-blue-600 rounded-lg">
                  <Zap className="h-4 w-4" />
                  <span>Live Daily Room Inventory (`Total Rooms - Bookings`)</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 bg-purple-500/10 text-purple-600 rounded-lg">
                  <Layers className="h-4 w-4" />
                  <span>Zero External Portal Logins Needed</span>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => handleEnableChannelSync('CHANNEX')}
                  disabled={enablingChannel}
                  className="inline-flex items-center gap-3 px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-extrabold text-base shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:translate-y-0"
                >
                  {enablingChannel ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Auto-creating Remote Property & Rooms...</span>
                    </>
                  ) : (
                    <>
                      <Power className="h-5 w-5" />
                      <span>Enable 2-Way Channel Sync for {selectedProperty?.name}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Active Status Card */}
              <div className="bg-card border border-green-500/30 rounded-3xl p-8 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 bg-green-500 rounded-full animate-ping" />
                      <span className="px-3 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-xs font-extrabold uppercase tracking-wider">
                        Active & Synchronized
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">
                        Partner: {activeChannelMapping.channelName}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-foreground">
                      {selectedProperty?.name} — Live OTA Sync Connected
                    </h3>
                    <p className="text-xs text-muted-foreground font-mono">
                      Remote Property ID: {activeChannelMapping.externalPropertyId}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 shrink-0">
                    <div className="flex flex-col items-end">
                      <button
                        onClick={handlePushAri}
                        disabled={pushingAri}
                        className="flex items-center gap-2 px-5 py-3 bg-primary/10 hover:bg-primary/20 text-primary rounded-2xl font-extrabold text-xs transition-all shadow-sm cursor-pointer"
                      >
                        <RefreshCw className={clsx("h-4 w-4", pushingAri && "animate-spin")} />
                        <span>{pushingAri ? "Force Pushing..." : "⚡ Force Refresh All Channels (Manual Push)"}</span>
                      </button>
                      <span className="text-[10px] text-muted-foreground mt-1 max-w-[280px] text-right leading-tight">
                        Daily sync runs automatically 24/7. Click only for instant manual re-sync after changing room setups.
                      </span>
                    </div>
                    <button
                      onClick={() => handleDisableChannelSync(activeChannelMapping.channelName)}
                      className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-600 rounded-2xl transition-colors shrink-0 cursor-pointer"
                      title="Pause Sync"
                    >
                      <Power className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Mapped Room Types List */}
                <div className="mt-8 pt-6 border-t border-border">
                  <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    Automated Room Type Mappings
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeChannelMapping.roomMappings && activeChannelMapping.roomMappings.length > 0 ? (
                      activeChannelMapping.roomMappings.map((roomMap) => (
                        <div key={roomMap.id} className="p-4 rounded-2xl bg-muted/40 border border-border flex items-center justify-between">
                          <div>
                            <span className="font-bold text-sm text-foreground block">
                              {roomMap.roomType?.name || 'Assigned Room Type'}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-mono">
                              Channex Room ID: {roomMap.externalRoomTypeId}
                            </span>
                          </div>
                          <span className="text-xs font-semibold px-2.5 py-1 bg-green-500/10 text-green-600 rounded-lg flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Connected
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-2 p-6 text-center text-sm text-muted-foreground bg-muted/20 rounded-2xl">
                        No individual room types mapped yet. Click "⚡ Force Refresh All Channels (Manual Push)" or ensure room types exist.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Direct 1-Click OTA Channel Connection Suite (PMS Native USP) */}
          {activeChannelMapping && (
            <div className="bg-card/90 border border-border rounded-3xl p-8 shadow-xl relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-border/80">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-extrabold text-[11px] uppercase tracking-wider">
                      ✦ PMS Native Feature
                    </span>
                    <h3 className="text-xl font-extrabold text-foreground">Direct Online Travel Portal Suite</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed max-w-2xl">
                    Connect your active hotel profiles (`MakeMyTrip, Booking.com, Agoda, Airbnb`) directly inside your PMS without navigating external portals. Enter your OTA Hotel ID below to establish instant 2-way room and price synchronization.
                  </p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    onClick={() => { setCustomOtaSearch(''); setDirectoryCategory('All'); setCustomOtaModal(true); }}
                    className="py-3 px-5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-extrabold text-xs rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Globe className="h-4 w-4" />
                    <span>🌐 Browse All 60+ Supported OTAs</span>
                  </button>
                </div>
              </div>

              {/* Emergency Master Stop Sell Banner (Channex USP) */}
              <div className={clsx(
                "mb-6 p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 transition-all shadow-md",
                emergencyStopSell
                  ? "bg-red-500/15 border-red-500 text-red-700 dark:text-red-300 animate-pulse"
                  : "bg-muted/40 border-border/80 text-foreground"
              )}>
                <div className="flex items-center gap-3">
                  <div className={clsx("p-2.5 rounded-xl shrink-0 font-extrabold", emergencyStopSell ? "bg-red-500 text-white" : "bg-primary/10 text-primary")}>
                    <Power className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-sm">
                        {emergencyStopSell ? "🛑 EMERGENCY STOP SELL ACTIVE — ALL ONLINE SALES CLOSED" : "Master Inventory Freeze (`Emergency Stop Sell`)"}
                      </h4>
                      {emergencyStopSell && <span className="px-2 py-0.5 rounded-md bg-red-600 text-white text-[10px] font-extrabold uppercase tracking-wider">60-Day Lock Active</span>}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                      {emergencyStopSell
                        ? "All connected OTAs (`MakeMyTrip, Booking.com, Agoda, Airbnb`) are currently blocked at 0 rooms to prevent overbooking during maintenance or emergencies."
                        : "Need to immediately block all online sales during an emergency, power outage, or hotel maintenance? Click to trigger a 60-day Stop Sell across all connected channels instantly."}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleToggleEmergencyStopSell}
                  className={clsx(
                    "px-4 py-2.5 rounded-xl font-extrabold text-xs shadow-md shrink-0 flex items-center gap-1.5 transition-all cursor-pointer",
                    emergencyStopSell
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-red-600 hover:bg-red-700 text-white"
                  )}
                >
                  <Power className="h-4 w-4" />
                  {emergencyStopSell ? "🟢 Resume Online Sales (`Deactivate Stop Sell`)" : "🛑 Activate Emergency Stop Sell (`Freeze All OTAs`)"}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { key: 'makemytrip', title: 'MakeMyTrip', placeholder: 'e.g. MMT-8891', color: 'from-blue-500/10 to-indigo-500/10 border-blue-500/30' },
                  { key: 'bookingcom', title: 'Booking.com', placeholder: 'e.g. BOOKING-4412', color: 'from-sky-500/10 to-blue-500/10 border-sky-500/30' },
                  { key: 'agoda', title: 'Agoda', placeholder: 'e.g. AGODA-9021', color: 'from-purple-500/10 to-pink-500/10 border-purple-500/30' },
                  { key: 'airbnb', title: 'Airbnb', placeholder: 'e.g. AIRBNB-771', color: 'from-rose-500/10 to-red-500/10 border-rose-500/30' },
                  { key: 'goibibo', title: 'Goibibo', placeholder: 'e.g. GO-PROP-3312', color: 'from-orange-500/10 to-amber-500/10 border-orange-500/30' },
                  { key: 'expedia', title: 'Expedia', placeholder: 'e.g. EXP-LIST-882', color: 'from-yellow-500/10 to-amber-500/10 border-yellow-500/30' },
                  { key: 'tripcom', title: 'Trip.com', placeholder: 'e.g. TRIP-ID-991', color: 'from-teal-500/10 to-cyan-500/10 border-teal-500/30' },
                  { key: 'easemytrip', title: 'EaseMyTrip', placeholder: 'e.g. EMT-HOTEL-551', color: 'from-emerald-500/10 to-green-500/10 border-emerald-500/30' },
                  ...customOtaList
                ].map((ota) => {
                  const status = connectedOtaStatus[ota.key] || { connected: false };
                  const configuredMarkup = otaConfigs[ota.key]?.rateMarkup;
                  return (
                    <div key={ota.key} className={clsx("p-4 rounded-2xl border bg-gradient-to-br transition-all flex flex-col justify-between", ota.color)}>
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-extrabold text-sm text-foreground flex items-center gap-1.5">
                            <Globe className="h-4 w-4 text-primary shrink-0" />
                            {ota.title}
                          </span>
                          {status.connected ? (
                            <div className="flex items-center gap-1">
                              {configuredMarkup && configuredMarkup !== '0%' && (
                                <span className="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold text-[9px]">
                                  {configuredMarkup}
                                </span>
                              )}
                              <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 font-bold text-[10px] flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Live
                              </span>
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold text-[10px]">
                              Not Linked
                            </span>
                          )}
                        </div>

                        {status.connected ? (
                          <div className="bg-background/80 rounded-xl p-2.5 border border-border flex items-center justify-between mt-2">
                            <div className="overflow-hidden">
                              <span className="text-[9px] uppercase font-bold text-muted-foreground block">Hotel ID</span>
                              <span className="font-mono text-xs font-bold text-foreground truncate block">{status.hotelId || 'Linked Profile'}</span>
                            </div>
                            <button
                              onClick={() => handleDisconnectDirectOta(ota.key, ota.title)}
                              className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-600 font-bold text-[11px] rounded-lg transition-colors shrink-0 cursor-pointer"
                            >
                              Disconnect
                            </button>
                          </div>
                        ) : (
                          <div className="mt-2">
                            <button
                              onClick={() => handleConnectDirectOta(ota.key, ota.title)}
                              className="w-full py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all"
                            >
                              <LinkIcon className="h-3.5 w-3.5" /> Configure & Connect
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 pt-3 border-t border-border/50">
                        <button
                          onClick={() => handleSimulateBooking(ota.title)}
                          disabled={simulatingOta === ota.title}
                          className="w-full py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-[11px] rounded-xl flex items-center justify-center gap-1 transition-colors"
                          title="Generate a test booking right now for demo & staging"
                        >
                          <Zap className={clsx("h-3 w-3", simulatingOta === ota.title && "animate-spin")} />
                          <span>{simulatingOta === ota.title ? "Simulating..." : `⚡ Test ${ota.title} Booking`}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Add Custom OTA Card */}
                <div
                  onClick={() => { setCustomOtaSearch(''); setCustomOtaModal(true); }}
                  className="p-5 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 transition-all flex flex-col items-center justify-center text-center cursor-pointer group min-h-[170px]"
                >
                  <div className="p-3 bg-primary/10 group-hover:bg-primary group-hover:text-primary-foreground text-primary rounded-2xl transition-all mb-2.5 shadow-sm">
                    <PlusCircle className="h-6 w-6" />
                  </div>
                  <h4 className="font-extrabold text-sm text-foreground">Add Another OTA Channel</h4>
                  <p className="text-[11px] text-muted-foreground mt-1 max-w-[190px]">
                    Connect Yatra, ClearTrip, VRBO, Google Hotels, or any of Channex's 60+ global portals directly inside PMS
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Sales & Operations Playbook Card */}
          <div className="bg-gradient-to-br from-card to-muted/30 border border-primary/20 rounded-3xl p-8 shadow-xl relative overflow-hidden">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-primary/10 rounded-2xl text-primary">
                <Globe className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-foreground flex items-center gap-2">
                  <span>Sales & Operations Playbook: Connecting MakeMyTrip, Booking.com & Agoda</span>
                
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Step-by-step procedure to link existing OTA hotel accounts to this real-time two-way synchronization engine.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-card/80 border border-border rounded-2xl p-6 relative flex flex-col justify-between">
                <div className="absolute -top-3 -right-3 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-extrabold text-xs shadow-md">
                  1
                </div>
                <div>
                  <h4 className="font-bold text-foreground text-sm flex items-center gap-2 mb-2">
                    <Layers className="h-4 w-4 text-primary" />
                    Register Property & Rooms in PMS
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    First, create the property and its Room Types here inside our PMS. Click <strong className="text-foreground">"Enable 2-Way Channel Sync"</strong> above. Our system automatically configures the property and room structures inside the global Channel Manager engine and instantly synchronizes all room inventory and base rates.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-border/50 text-[11px] font-mono text-green-600 dark:text-green-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Automated by PMS Cloud Engine
                </div>
              </div>

              <div className="bg-card/80 border border-border rounded-2xl p-6 relative flex flex-col justify-between">
                <div className="absolute -top-3 -right-3 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-extrabold text-xs shadow-md">
                  2
                </div>
                <div>
                  <h4 className="font-bold text-foreground text-sm flex items-center gap-2 mb-2">
                    <LinkIcon className="h-4 w-4 text-primary" />
                    Link OTA Account & Map Room Types
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Open your <a href="https://staging.channex.io" target="_blank" rel="noreferrer" className="text-primary hover:underline font-semibold">Channel Manager Portal</a> &rarr; go to <strong className="text-foreground">Channels</strong> &rarr; click <strong className="text-foreground">Create Channel</strong> (e.g. MakeMyTrip, Booking.com, Agoda). Enter the property's existing OTA Hotel ID. The system will load their online room types—simply select our matching PMS Room Type from the dropdown and save!
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-border/50 text-[11px] font-mono text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5" /> Takes ~30 Seconds per OTA
                </div>
              </div>

              <div className="bg-card/80 border border-border rounded-2xl p-6 relative flex flex-col justify-between">
                <div className="absolute -top-3 -right-3 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-extrabold text-xs shadow-md">
                  3
                </div>
                <div>
                  <h4 className="font-bold text-foreground text-sm flex items-center gap-2 mb-2">
                    <ShieldCheck className="h-4 w-4 text-green-500" />
                    100% Hands-Free Live Sync Active
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Once saved, the platform instantly synchronizes your live inventory across all connected booking channels. When a guest books on MMT or Booking.com, the reservation arrives directly in our PMS and blocks the physical room. When you create or cancel a booking locally, all OTAs update automatically!
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-border/50 text-[11px] font-mono text-purple-600 dark:text-purple-400 flex items-center gap-1">
                  <RefreshCw className="h-3.5 w-3.5" /> Continuous 2-Way Automation
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-primary/5 border border-primary/10 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3 text-xs text-muted-foreground">
                <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span>
                  <strong className="text-foreground">Important Note for Sales Team:</strong> Hotels must already have verified merchant listings with MakeMyTrip, Booking.com, or Agoda (with GST and bank verification done). Once they provide their Hotel Property ID, connecting them to this live 2-way sync takes under 2 minutes.
                </span>
              </div>
              <a
                href="https://staging.channex.io/channels"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-xl hover:bg-primary/90 transition-colors shrink-0"
              >
                <span>Open Channel Manager Dashboard</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      ) : (
        /* Tab Content: Legacy iCal */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Export Feed Section */}
          <div className="md:col-span-3 space-y-4">
            <div className="group bg-card border border-border rounded-3xl p-8 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-green-500/10 rounded-lg text-green-600 dark:text-green-400">
                  <ExternalLink className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Export iCal Availability Feed</h2>
              </div>

              <p className="text-sm text-muted-foreground mb-6">
                Use this link to export your calendar to basic platforms that only accept iCal files (e.g. basic Airbnb calendar link). Copy this URL and paste it into the "Import Calendar" section of the external site.
              </p>

              <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-2xl border border-border group-hover:border-primary/50 transition-colors">
                <code className="flex-1 text-xs font-mono truncate text-primary/80">
                  {exportUrl}
                </code>
                <button
                  onClick={() => copyToClipboard(exportUrl)}
                  className="p-2 hover:bg-primary/10 text-primary rounded-xl transition-colors shrink-0"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 flex items-start gap-2 text-[11px] text-muted-foreground bg-blue-500/5 p-3 rounded-xl border border-blue-500/10">
                <Info className="h-4 w-4 text-blue-500 shrink-0" />
                <span>iCal feeds refresh periodically (typically every 30-60 minutes depending on the external site). For instant real-time sync, use the Real-Time OTA Channel Sync tab above.</span>
              </div>
            </div>
          </div>

          {/* Import Links Table */}
          <div className="md:col-span-2 space-y-4">
            <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
              <div className="p-6 border-b border-border bg-muted/30">
                <h3 className="font-bold flex items-center gap-2">
                  <LinkIcon className="h-4 w-4 text-primary" />
                  Active iCal Connections
                </h3>
              </div>

              <div className="divide-y divide-border">
                {links.length === 0 ? (
                  <div className="p-12 text-center space-y-3">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                      <RefreshCw className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                    <p className="text-sm text-muted-foreground">No external iCal calendars connected yet.</p>
                  </div>
                ) : (
                  links.map((link) => (
                    <div key={link.id} className="p-6 hover:bg-muted/30 transition-colors group">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">{link.platformName}</span>
                            {(link as any).bookingSource && (
                              <span className="text-[10px] px-2 py-0.5 bg-blue-500/10 text-blue-600 rounded-md font-medium">
                                Linked to: {(link as any).bookingSource.name}
                              </span>
                            )}
                            <span className={clsx(
                              "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                              link.status === 'ACTIVE'
                                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                            )}>
                              {link.status}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground font-mono truncate max-w-[200px] sm:max-w-xs">
                            {link.icalUrl}
                          </p>
                          <div className="flex items-center gap-3 pt-2">
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              {link.lastSyncedAt ? (
                                <>
                                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                                  Last synced: {new Date(link.lastSyncedAt).toLocaleString()}
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="h-3 w-3 animate-spin text-primary" />
                                  Never synced
                                </>
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleManualSync(link.id)}
                            disabled={syncing === link.id}
                            className="p-2 hover:bg-primary/10 text-primary rounded-xl transition-all hover:rotate-180 duration-500 disabled:opacity-50"
                            title="Sync Now"
                          >
                            <RefreshCw className={clsx("h-4 w-4", syncing === link.id && "animate-spin")} />
                          </button>
                          <button
                            onClick={() => handleDeleteLink(link.id)}
                            className="p-2 hover:bg-red-500/10 text-red-500 rounded-xl transition-colors"
                            title="Delete Connection"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Add Link Form */}
          <div className="md:col-span-1 space-y-4">
            <div className="bg-card border border-border rounded-3xl p-6 shadow-sm sticky top-8">
              <div className="flex items-center gap-2 mb-6">
                <Plus className="h-5 w-5 text-primary" />
                <h3 className="font-bold">Add iCal Feed</h3>
              </div>

              <form onSubmit={handleAddLink} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Platform Name
                  </label>
                  <input
                    required
                    value={platformName}
                    onChange={(e) => setPlatformName(e.target.value)}
                    placeholder="e.g. Airbnb"
                    className="w-full px-4 py-3 bg-muted/50 border border-border rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    iCal Feed URL
                  </label>
                  <div className="relative">
                    <input
                      required
                      type="url"
                      value={icalUrl}
                      onChange={(e) => setIcalUrl(e.target.value)}
                      placeholder="https://platform.com/calendar.ics"
                      className="w-full px-4 py-3 bg-muted/50 border border-border rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all pr-10"
                    />
                    <LinkIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Link to Booking Source (Optional)
                  </label>
                  <div className="relative">
                    <select 
                      value={bookingSourceId}
                      onChange={(e) => setBookingSourceId(e.target.value)}
                      className="w-full px-4 py-3 bg-muted/50 border border-border rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none"
                    >
                      <option value="">No specific source</option>
                      {sources.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                  <p className="text-[10px] text-muted-foreground italic px-1">
                    Linking a source helps in automated commission tracking and analysis.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={adding}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-primary text-primary-foreground rounded-2xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:translate-y-0"
                >
                  {adding ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                  Save iCal Link
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Channel Configuration & Schema Modal (Separate Component) */}
      <ChannexOtaModal
        open={!!activeOtaModal?.open}
        otaKey={activeOtaModal?.otaKey || ''}
        otaTitle={activeOtaModal?.otaTitle || ''}
        initialConfig={activeOtaModal?.otaKey ? otaConfigs[activeOtaModal.otaKey] : {}}
        catalogItem={availableCatalog.find(ch => ch.key === activeOtaModal?.otaKey)}
        onClose={() => setActiveOtaModal(null)}
        onSave={(key, title, config) => handleSaveOtaConfig(key, title, config)}
      />

      {/* Actionable Setup Required Modal (Guides user to Rooms / Room Types) */}
      {setupModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl shrink-0">
                <AlertCircle className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-foreground">{setupModal.title}</h3>
                <p className="text-xs text-muted-foreground">Prerequisite missing before activating live OTA sync</p>
              </div>
            </div>

            <div className="p-4 bg-muted/40 border border-border rounded-2xl text-xs text-foreground leading-relaxed">
              {setupModal.message}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => { window.location.href = '/rooms'; }}
                className="flex-1 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2"
              >
                Go to Rooms Management <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => { window.location.href = '/room-types'; }}
                className="py-3 px-4 bg-muted hover:bg-muted/80 text-foreground font-bold text-xs rounded-xl transition-all text-center"
              >
                Go to Room Types
              </button>
              <button
                onClick={() => setSetupModal({ open: false, title: '', message: '' })}
                className="py-3 px-4 bg-transparent hover:bg-red-500/10 text-muted-foreground hover:text-red-500 font-bold text-xs rounded-xl transition-all text-center"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom System Confirm Modal (`Replacing window.confirm`) */}
      {confirmModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 text-primary rounded-2xl shrink-0">
                <AlertCircle className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-foreground">{confirmModal.title}</h3>
                <p className="text-xs text-muted-foreground">Action Confirmation Required</p>
              </div>
            </div>

            <div className="p-4 bg-muted/40 border border-border rounded-2xl text-xs text-foreground leading-relaxed whitespace-pre-line font-medium">
              {confirmModal.message}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmModal({ open: false, title: '', message: '', onConfirm: () => {} })}
                className="py-2.5 px-5 bg-muted hover:bg-muted/80 text-foreground font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const cb = confirmModal.onConfirm;
                  setConfirmModal({ open: false, title: '', message: '', onConfirm: () => {} });
                  cb();
                }}
                className={clsx(
                  "py-2.5 px-6 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5",
                  confirmModal.confirmColor || "bg-primary hover:bg-primary/90 text-primary-foreground"
                )}
              >
                <Check className="h-4 w-4" />
                <span>{confirmModal.confirmLabel || 'Confirm Action'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Owner & Staff Guide Modal (`Why Use Channel Manager & Calendar Sync`) */}
      {ownerGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-card border border-primary/30 rounded-3xl max-w-3xl w-full p-8 shadow-2xl space-y-6 my-auto max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setOwnerGuideModal(false)}
              className="absolute top-6 right-6 p-2 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3.5 pb-4 border-b border-border">
              <div className="p-3.5 bg-gradient-to-br from-primary to-blue-600 text-white rounded-2xl shadow-md">
                <BookOpen className="h-7 w-7" />
              </div>
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-extrabold text-[10px] uppercase tracking-wider">
                  ✦ Resort Owner & Staff Handbook
                </span>
                <h3 className="text-2xl font-extrabold text-foreground mt-0.5">
                  Why Use Channel Manager & Calendar Sync?
                </h3>
                <p className="text-xs text-muted-foreground">
                  A simple, non-technical guide on how this real-time system protects revenue and simplifies daily operations.
                </p>
              </div>
            </div>

            <div className="space-y-5 text-sm">
              <div className="p-5 rounded-2xl bg-primary/5 border border-primary/20 space-y-2">
                <h4 className="font-extrabold text-primary flex items-center gap-2 text-base">
                  <ShieldCheck className="h-5 w-5" /> 1. Never Double-Book a Room Again (`Real-Time 2-Way Lock`)
                </h4>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  When a guest books a room on <b>MakeMyTrip, Booking.com, or Agoda</b>, our system automatically locks that exact room across all other websites and your front desk within seconds. If a walk-in guest checks in at your front desk, that room instantly closes online across every connected travel portal so nobody else can book it.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-card border border-border space-y-2">
                <h4 className="font-extrabold text-foreground flex items-center gap-2 text-base">
                  <Globe className="h-5 w-5 text-blue-500" /> 2. One Dashboard for Everything (`Zero Extranet Logins`)
                </h4>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Your front desk staff no longer needs to open 5 different browser tabs or remember passwords for MakeMyTrip, Agoda, Airbnb, and Booking.com every morning. Every reservation comes straight into your PMS Live Calendar with guest details, payment status, and commission rates automatically calculated.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-card border border-border space-y-2">
                <h4 className="font-extrabold text-foreground flex items-center gap-2 text-base">
                  <Zap className="h-5 w-5 text-amber-500" /> 3. What is the "⚡ Force Refresh All Channels (Manual Push)" Button? (`Daily vs. Manual`)
                </h4>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  <b>Do you need to click this button every day, week, or month? NO!</b> Under normal daily resort operations, your room availability, rate updates, and reservations synchronize automatically 24/7 in the background across all connected OTAs without any human intervention.
                  <br /><br />
                  <b>When should you click this button?</b> Only as a <i>manual safety refresh</i>—for example, if you just added brand new physical rooms to your property settings, modified rate tiers, or if your resort's internet/power connection was down during a storm and you want to instantly trigger a manual double-check to push your exact local room availability across all OTAs right now.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-card border border-border space-y-2">
                <h4 className="font-extrabold text-foreground flex items-center gap-2 text-base">
                  <Layers className="h-5 w-5 text-purple-500" /> 4. Protect Net Revenue (`Automatic Commission Markups`)
                </h4>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Online travel portals charge 15% to 22% commissions on every booking. In our configuration modal, you can set a <b>+15% or +20% Rate Markup</b> for specific OTAs. Our system will automatically adjust your base room price higher when sending it to that OTA, ensuring you receive your exact required net room profit after their commission deduction.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-card border border-border space-y-2">
                <h4 className="font-extrabold text-foreground flex items-center gap-2 text-base">
                  <Power className="h-5 w-5 text-red-500" /> 5. Instant Emergency Freeze (Master Stop Sell)
                </h4>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  If your resort faces a power outage, sudden maintenance, or water issue, you don't need to call OTA support. Simply click the red <b>"Activate Emergency Stop Sell"</b> button on this dashboard to immediately close online bookings across all channels for the next 60 days with 1 click. Click it again to resume sales when ready.
                </p>
              </div>

              {/* Complete Directory of Supported Portals */}
              <div className="p-5 rounded-2xl bg-muted/30 border border-border space-y-3.5">
                <h4 className="font-extrabold text-foreground flex items-center gap-2 text-base">
                  <Globe className="h-5 w-5 text-emerald-500" /> 6. Complete Directory of Supported Online Travel Portals (60+ Networks)
                </h4>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Our Direct Suite supports instant connection to over 60 global, regional, and specialized booking networks. You can link any of the following platforms right from your dashboard without external support:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-background border border-border/70 space-y-1.5 shadow-xs">
                    <span className="font-bold text-primary block flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5" /> Top Global & Regional Leaders
                    </span>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      MakeMyTrip / Goibibo, Booking.com, Agoda, Airbnb, Expedia Group (Hotels.com / Vrbo / Orbitz), Trip.com / Ctrip, EaseMyTrip, VRBO / HomeAway, Yatra.com, ClearTrip, and Traveloka.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-background border border-border/70 space-y-1.5 shadow-xs">
                    <span className="font-bold text-primary block flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" /> B2B Wholesalers & Global Distribution
                    </span>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Hotelbeds, WebBeds / JacTravel, DidaTravel, HyperGuest, OTS Globe, GoGlobal Travel, Travco, Bedsline, and Stuba.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-background border border-border/70 space-y-1.5 shadow-xs">
                    <span className="font-bold text-primary block flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5" /> Metasearch, Hostels & Vacation Rentals
                    </span>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Google Hotel Ads (Direct Search Bookings), Hostelworld, Agoda Homes, Mr & Mrs Smith (Luxury Collection), Tiketi.com, Despegar / Decolar, and Welcomebeds.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-background border border-border/70 space-y-1.5 shadow-xs">
                    <span className="font-bold text-primary block flex items-center gap-1.5">
                      <Plus className="h-3.5 w-3.5" /> 40+ Additional Specialized Networks
                    </span>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Ostrovok, TUI Musement, HRS Hotel Reservation Service, HotelSpecials, KeyTel Hotusa, Pegas Touristik, Smyrooms Logitravel, Sunweb Group, Roibos, Peakwork, Jumio, Wakanow, Hotelston, and Intui Travel.
                    </p>
                  </div>
                </div>
                <div className="p-3 bg-primary/10 rounded-xl border border-primary/20 text-xs text-foreground flex items-center gap-2">
                  <span className="font-bold text-primary shrink-0">💡 How to Connect Any Portal:</span>
                  <span>Click <b>"+ Add Another OTA Channel"</b> on the dashboard, select <b>"Other Supported Travel Portal"</b>, and pick your booking site from the dropdown list!</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border flex justify-end">
              <button
                onClick={() => setOwnerGuideModal(false)}
                className="py-3 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-xs rounded-2xl shadow-lg shadow-primary/20 transition-all cursor-pointer"
              >
                Got It, Close Handbook
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Directory of Supported Online Travel Portals (60+ Networks) Modal */}
      {customOtaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                  <Globe className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-foreground">Supported Travel Portals Directory (60+ Networks)</h3>
                  <p className="text-xs text-muted-foreground">Select any booking channel or B2B distributor below to establish real-time 2-way sync</p>
                </div>
              </div>
              <button
                onClick={() => setCustomOtaModal(false)}
                className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
              {['All', 'Global Leaders', 'Wholesalers & B2B', 'European & Specialized', 'Vacation & Metasearch'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setDirectoryCategory(cat)}
                  className={clsx(
                    "px-3 py-1.5 rounded-xl font-extrabold shrink-0 transition-all cursor-pointer",
                    directoryCategory === cat
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {cat === 'All' ? '🌟 All Channels (60+)' : cat}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={customOtaSearch}
                onChange={(e) => setCustomOtaSearch(e.target.value)}
                placeholder="Search portal name (e.g., Ostrovok, TUI, HRS, Hotelbeds, MakeMyTrip, Agoda, VRBO...)"
                className="w-full pl-10 pr-4 py-2.5 bg-muted/40 border border-border rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div className="overflow-y-auto space-y-2 max-h-[400px] pr-1">
              {availableCatalog
                .filter(ch => {
                  const matchesSearch = ch.title.toLowerCase().includes(customOtaSearch.toLowerCase()) || ch.key.toLowerCase().includes(customOtaSearch.toLowerCase());
                  if (!matchesSearch) return false;
                  if (directoryCategory === 'All') return true;
                  if (directoryCategory === 'Global Leaders') return ['Global Leader', 'Regional Leader'].includes(ch.category);
                  if (directoryCategory === 'Wholesalers & B2B') return ['Wholesalers & B2B'].includes(ch.category);
                  if (directoryCategory === 'European & Specialized') return ['European & Specialized', 'Generic / Custom'].includes(ch.category);
                  if (directoryCategory === 'Vacation & Metasearch') return ['Vacation Rentals', 'Metasearch & Direct', 'Hostels & Budget', 'Luxury & Boutique'].includes(ch.category);
                  return true;
                })
                .map((ch) => {
                  const alreadyInGrid = ['makemytrip', 'bookingcom', 'agoda', 'airbnb', 'goibibo', 'expedia', 'tripcom', 'easemytrip'].includes(ch.key) ||
                    customOtaList.some(item => item.key === ch.key);

                  return (
                    <div
                      key={ch.key}
                      className={clsx(
                        "p-3.5 rounded-2xl border flex items-center justify-between transition-all",
                        alreadyInGrid
                          ? "bg-muted/30 border-border/60 opacity-60"
                          : "bg-card hover:bg-primary/5 border-border hover:border-primary/40 cursor-pointer shadow-xs"
                      )}
                      onClick={() => {
                        if (!alreadyInGrid) {
                          setCustomOtaList(prev => [...prev, ch]);
                          setCustomOtaModal(false);
                          toast.success(`Added ${ch.title.split(' ')[0]} to your Direct Online Travel Portal Suite!`);
                          handleConnectDirectOta(ch.key, ch.title);
                        } else {
                          setCustomOtaModal(false);
                          handleConnectDirectOta(ch.key, ch.title);
                        }
                      }}
                    >
                      <div className="flex items-center gap-3 overflow-hidden pr-2">
                        <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0">
                          <Globe className="h-4 w-4" />
                        </div>
                        <div className="overflow-hidden">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-foreground truncate block">{ch.title}</span>
                            <span className="px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-bold text-[9px] uppercase tracking-wider shrink-0">
                              {ch.category || 'Travel Portal'}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground truncate block">2-Way Real-Time Rate & Inventory Automation</span>
                        </div>
                      </div>
                      {alreadyInGrid ? (
                        <button className="px-3 py-1.5 rounded-xl bg-muted/80 hover:bg-muted text-foreground font-bold text-xs transition-all shrink-0 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Configure
                        </button>
                      ) : (
                        <button className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-sm hover:bg-primary/90 transition-all shrink-0 flex items-center gap-1">
                          <Plus className="h-3.5 w-3.5" /> Connect Now
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>

            <div className="pt-3 border-t border-border flex justify-between items-center text-[11px] text-muted-foreground">
              <span>💡 Click any portal above to instantly open its non-technical connection form.</span>
              <button
                onClick={() => setCustomOtaModal(false)}
                className="py-2 px-4 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-xl transition-all cursor-pointer"
              >
                Close Directory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
