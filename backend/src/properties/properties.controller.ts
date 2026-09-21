import {
    Controller,
    Get,
    Post,
    Put,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
    BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto, UpdatePropertyDto, PropertyQueryDto } from './dto/property.dto';
import { RegisterPropertyDto } from './dto/register-property.dto';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../auth/constants/permissions.constant';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PropertyStatus, RequestStatus } from '@prisma/client';
import axios from 'axios';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const geoip = require('offline-geo-from-ip');

@ApiTags('Properties')
@Controller('properties')
export class PropertiesController {
    constructor(private readonly propertiesService: PropertiesService) { }

    // ============================================
    // AGREEMENTS & CONTRACT ENGINE
    // ============================================

    @Get('agreements/template')
    @ApiOperation({ summary: 'Get master property listing & platform agreement template' })
    getAgreementTemplate() {
        return this.propertiesService.getAgreementTemplate();
    }

    @Get('requests/:id/agreement')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get tailored property listing agreement payload for onboarding request' })
    getAgreementForRequest(@Request() req, @Param('id') id: string) {
        return this.propertiesService.getAgreementForRequest(req.user, id);
    }

    @Post('requests/:id/accept-agreement')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Record electronic acceptance for onboarding request agreement' })
    acceptRequestAgreement(@Request() req, @Param('id') id: string, @Body() body: any) {
        const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
        const userAgent = req.headers['user-agent'] || 'Web / Mobile Client';
        return this.propertiesService.acceptRequestAgreement(req.user, id, body, { ipAddress, userAgent });
    }

    @Get('requests/:id/agreement-audit')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.PROPERTIES.READ)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get agreement contract payload and electronic audit details (Admin)' })
    getAgreementAuditDetails(@Request() req, @Param('id') id: string) {
        return this.propertiesService.getAgreementAuditDetails(req.user, id);
    }

    @Get(':id/agreement')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get tailored agreement payload for existing property' })
    getAgreementForProperty(@Request() req, @Param('id') id: string) {
        return this.propertiesService.getAgreementForProperty(req.user, id);
    }

    @Post(':id/accept-agreement')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Record electronic acceptance for existing property agreement' })
    acceptPropertyAgreement(@Request() req, @Param('id') id: string, @Body() body: any) {
        const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
        const userAgent = req.headers['user-agent'] || 'Web / Mobile Client';
        return this.propertiesService.acceptPropertyAgreement(req.user, id, body, { ipAddress, userAgent });
    }

    // ============================================
    // VETTING & OVERSIGHT (ONBOARDING REQUESTS)
    // ============================================

    @Post('requests')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.PROPERTIES.CREATE) // Marketing can create requests
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a property onboarding request (Maker)' })
    createRequest(@Request() req, @Body() dto: any) {
        return this.propertiesService.createRequest(req.user, dto);
    }

    @Get('requests')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.PROPERTIES.READ)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'List all property onboarding requests' })
    findAllRequests(@Request() req, @Query('status') status?: RequestStatus) {
        return this.propertiesService.findAllRequests(req.user, status);
    }

    @Patch('requests/:id/approve')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.PROPERTIES.APPROVE) // Only admins can approve
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Approve property onboarding request (Checker)' })
    approveRequest(@Request() req, @Param('id') id: string) {
        return this.propertiesService.approveRequest(req.user, id);
    }

    @Patch('requests/:id/reject')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.PROPERTIES.APPROVE) // Only admins can reject
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Reject property onboarding request (Checker)' })
    rejectRequest(
        @Request() req,
        @Param('id') id: string,
        @Body('reason') reason: string
    ) {
        return this.propertiesService.rejectRequest(req.user, id, reason);
    }

    @Get('requests/my')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current user\'s property requests' })
    findMyRequests(@Request() req) {
        return this.propertiesService.findMyRequests(req.user.id);
    }

    @Patch('requests/:id/my')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update your pending property request' })
    updateMyRequest(@Request() req, @Param('id') id: string, @Body() payload: any) {
        return this.propertiesService.updateRequest(req.user.id, id, payload);
    }

    @Get('expand-url')
    @ApiOperation({ summary: 'Expand shortened Google Maps URL and extract coordinates' })
    async expandUrl(@Query('url') shortUrl: string) {
        if (!shortUrl || typeof shortUrl !== 'string') {
            return { url: '', latitude: null, longitude: null };
        }

        const trimmedUrl = shortUrl.trim();

        // 1. Strict Security Whitelist: only allow Google Maps URLs (prevents SSRF)
        const isGoogleMaps = /^(https?:\/\/)?([a-zA-Z0-9.-]+\.)?(google\.com\/maps|maps\.google\.[a-z.]+|goo\.gl\/maps|maps\.app\.goo\.gl)/i.test(trimmedUrl);
        if (!isGoogleMaps) {
            throw new BadRequestException('Invalid URL. Only Google Maps links are supported.');
        }

        const ensureProtocolUrl = trimmedUrl.startsWith('http') ? trimmedUrl : `https://${trimmedUrl}`;

        // Helper regex extraction
        const extractCoords = (targetUrl: string): { latitude: number | null; longitude: number | null } => {
            if (!targetUrl) return { latitude: null, longitude: null };

            // Pattern 1: Protobuf !3dlat!4dlng (highest precision — exact place pin)
            const protoMatch = targetUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
            if (protoMatch) return { latitude: parseFloat(protoMatch[1]), longitude: parseFloat(protoMatch[2]) };

            // Pattern 2: Standard @lat,lng (camera/map view)
            const atMatch = targetUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
            if (atMatch) return { latitude: parseFloat(atMatch[1]), longitude: parseFloat(atMatch[2]) };

            // Pattern 3: Query parameters ?q=lat,lng or ?ll=lat,lng or ?query=lat,lng or destination=lat,lng
            const queryMatch = targetUrl.match(/[?&](?:q|ll|query|destination)=(-?\d+\.\d+),(-?\d+\.\d+)/i);
            if (queryMatch) return { latitude: parseFloat(queryMatch[1]), longitude: parseFloat(queryMatch[2]) };

            // Pattern 4: Path /place/lat,lng
            const placeMatch = targetUrl.match(/\/place\/(-?\d+\.\d+),(-?\d+\.\d+)/i);
            if (placeMatch) return { latitude: parseFloat(placeMatch[1]), longitude: parseFloat(placeMatch[2]) };

            return { latitude: null, longitude: null };
        };

        // Try extracting directly first
        const directCoords = extractCoords(ensureProtocolUrl);
        if (directCoords.latitude !== null && directCoords.longitude !== null) {
            return { url: ensureProtocolUrl, ...directCoords, noCoordinatesFound: false };
        }

        // 2. Fetch and follow redirects securely
        try {
            const response = await axios.get(ensureProtocolUrl, {
                maxRedirects: 10,
                timeout: 7000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                },
                validateStatus: (status) => status >= 200 && status < 400
            });

            const finalUrl = response.request?.res?.responseUrl || response.headers?.location || ensureProtocolUrl;
            let coords = extractCoords(finalUrl);

            // If coordinates not found in final URL string, inspect HTML response body for meta tags and embedded state
            if ((coords.latitude === null || coords.longitude === null) && typeof response.data === 'string') {
                // 1. Check meta tags / canonical / og:url
                const ogMatch = response.data.match(/property="og:url"\s+content="([^"]+)"/i) ||
                                response.data.match(/content="([^"]+)"\s+property="og:url"/i);
                if (ogMatch && ogMatch[1]) {
                    const ogCoords = extractCoords(ogMatch[1]);
                    if (ogCoords.latitude !== null && ogCoords.longitude !== null) {
                        coords = ogCoords;
                    }
                }

                // 2. Direct regex patterns in HTML (excluding client viewport center=)
                if (coords.latitude === null || coords.longitude === null) {
                    const metaMatch = response.data.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) ||
                                      response.data.match(/content="[^"]*@(-?\d+\.\d+),(-?\d+\.\d+)/) ||
                                      response.data.match(/APP_INITIALIZATION_STATE=\[\[\[\d+,\d+,(-?\d+\.\d+),(-?\d+\.\d+)\]/) ||
                                      response.data.match(/window\.APP_INITIALIZATION_STATE\s*=\s*\[\[\[\d+,\d+,(-?\d+\.\d+),(-?\d+\.\d+)\]/) ||
                                      response.data.match(/\[null,null,(-?\d+\.\d+),(-?\d+\.\d+)\]/);
                    if (metaMatch) {
                        coords = { latitude: parseFloat(metaMatch[1]), longitude: parseFloat(metaMatch[2]) };
                    }
                }
            }

            // 3. Fallback: If URL has place name / address in path but no coords (e.g. data-only URL), geocode address
            if (coords.latitude === null || coords.longitude === null) {
                const placePathMatch = finalUrl.match(/\/place\/([^/@?]+)/);
                if (placePathMatch) {
                    const rawPlace = decodeURIComponent(placePathMatch[1].replace(/\+/g, ' '));
                    const parts = rawPlace.split(',').map(s => s.trim()).filter(Boolean);

                    const candidates: string[] = [rawPlace];
                    if (parts.length > 2) {
                        candidates.push(parts.slice(1).join(', '));
                        candidates.push(parts.slice(2).join(', '));
                        candidates.push(parts.slice(-3).join(', '));
                        candidates.push(parts.slice(-2).join(', '));
                    }
                    const uniqueCandidates = [...new Set(candidates)];

                    for (const query of uniqueCandidates) {
                        try {
                            const geoRes = await axios.get('https://nominatim.openstreetmap.org/search', {
                                params: { q: query, format: 'json', limit: 1 },
                                headers: { 'User-Agent': 'ResortManagementSystem/1.0' },
                                timeout: 3500
                            });
                            if (geoRes.data && geoRes.data.length > 0) {
                                coords = {
                                    latitude: parseFloat(geoRes.data[0].lat),
                                    longitude: parseFloat(geoRes.data[0].lon),
                                };
                                break;
                            }
                        } catch {}
                    }
                }
            }

            const hasCoords = coords.latitude !== null && coords.longitude !== null;

            return {
                url: finalUrl,
                latitude: coords.latitude,
                longitude: coords.longitude,
                noCoordinatesFound: !hasCoords,
            };
        } catch (error: any) {
            const fallbackUrl = error.response?.headers?.location || error.config?.url || ensureProtocolUrl;
            const coords = extractCoords(fallbackUrl);
            const hasCoords = coords.latitude !== null && coords.longitude !== null;
            return {
                url: fallbackUrl,
                latitude: coords.latitude,
                longitude: coords.longitude,
                noCoordinatesFound: !hasCoords,
            };
        }
    }

    // ============================================
    // PUBLIC ENDPOINTS
    // ============================================

    @Get('public/lookup-owners')
    @ApiOperation({ summary: 'Lookup existing property owners by email or phone during registration' })
    lookupOwners(@Query('email') email?: string, @Query('phone') phone?: string) {
        return this.propertiesService.lookupOwners(email, phone);
    }

    @Get('public/check-email-availability')
    @ApiOperation({ summary: 'Check if an owner email is available during registration Step 1' })
    checkEmailAvailability(@Query('email') email: string, @Query('phone') phone?: string) {
        return this.propertiesService.checkEmailAvailability(email, phone);
    }

    @Post('public/verify-owner-password')
    @ApiOperation({ summary: 'Verify existing property owner password during registration Step 1' })
    verifyOwnerPassword(@Body() body: { userId?: string; email?: string; phone?: string; password?: string }) {
        return this.propertiesService.verifyOwnerPassword(body.password, body.userId, body.email, body.phone);
    }

    @Post('public-register')
    @ApiOperation({ summary: 'Public registration for Property Owners' })
    publicRegister(@Body() dto: RegisterPropertyDto) {
        return this.propertiesService.publicRegister(dto);
    }

    @Post('public/send-commission-otp')
    @ApiOperation({ summary: 'Send OTP for Commission Verification (Public)' })
    sendCommissionOtp(@Body('phone') phone: string, @Body('commission') commission: number) {
        return this.propertiesService.sendCommissionOtp(phone, commission);
    }

    @Post('public/verify-commission-otp')
    @ApiOperation({ summary: 'Verify OTP for Commission (Public)' })
    verifyCommissionOtp(@Body('phone') phone: string, @Body('code') code: string) {
        return this.propertiesService.verifyCommissionOtp(phone, code);
    }

    @Post('public/gst-lookup')
    @ApiOperation({ summary: 'Lookup GST details and autofill address (Public)' })
    gstLookup(@Body() body: any) {
        const gstNumber = typeof body === 'string' ? body : (body?.gstNumber || body?.gstin || '');
        return this.propertiesService.gstLookup(gstNumber);
    }

    @Get('public/gst-lookup')
    @ApiOperation({ summary: 'Lookup GST details via GET (Public)' })
    gstLookupGet(@Query('gstNumber') gstNumber: string) {
        return this.propertiesService.gstLookup(gstNumber);
    }

    @Get('homepage-featured')
    @ApiOperation({ summary: 'Get featured properties for homepage promo cards (single cascade)' })
    async getHomepageFeatured(
        @Query('limit') limit?: string,
        @Query('city') city?: string,
    ) {
        return this.propertiesService.getHomepageFeatured(
            limit ? parseInt(limit) : 3,
            city || undefined,
        );
    }

    @Get()
    @ApiOperation({ summary: 'List all properties (public)' })
    findAll(@Query() query: PropertyQueryDto) {
        console.log('all propertis api has called ')
        return this.propertiesService.findAll(query);
    }


    @Get('detect-location')
    @ApiOperation({ summary: 'Detect user location from Cloudflare headers or fallback IP (public)' })
    async detectLocation(@Request() req: any, @Query('ip') queryIp?: string) {
        // 1. Try Cloudflare headers first (unless queryIp is provided)
        if (!queryIp) {
            const cityHeader = req.headers['cf-ipcity'];
            const regionHeader = req.headers['cf-region'];

            if (cityHeader) {
                return {
                    city: Array.isArray(cityHeader) ? cityHeader[0] : cityHeader,
                    region: Array.isArray(regionHeader) ? regionHeader[0] : (regionHeader || null),
                };
            }
        }

        // 2. Fallback: Parse client IP from query param, proxy headers (x-forwarded-for), or socket remote address
        let ip = queryIp || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        if (Array.isArray(ip)) {
            ip = ip[0];
        } else if (typeof ip === 'string') {
            ip = ip.split(',')[0].trim();
        }

        // Clean up IPv6-mapped IPv4 addresses (e.g. ::ffff:192.168.1.1 or ::ffff:49.36.85.12)
        if (ip && ip.startsWith('::ffff:')) {
            ip = ip.substring(7);
        }

        console.log('[Geolocation] Detected Client IP:', ip);

        // If local IP, return null (triggers dev fallback in frontend)
        if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
            console.log('[Geolocation] Local/private IP detected, returning fallback null');
            return { city: null, region: null };
        }

        try {
            // Geolocate the IP locally via offline-geo-from-ip
            const geo = geoip.allData(ip);
            console.log('[Geolocation] Lookup result:', geo);
            if (geo && geo.city) {
                return {
                    city: geo.city,
                    region: geo.state || null,
                };
            }
        } catch (error) {
            console.error('[Geolocation] Failed to geolocate IP locally via offline-geo-from-ip:', error);
        }

        return { city: null, region: null };
    }

    @Get('autocomplete')
    @ApiOperation({ summary: 'Google Places autocomplete proxy (public)' })
    autocomplete(@Query('input') input: string) {
        return this.propertiesService.getPlaceAutocomplete(input || '');
    }

    @Get('place-details')
    @ApiOperation({ summary: 'Get place details (lat/lng) by placeId proxy (public)' })
    getPlaceDetails(@Query('placeId') placeId: string) {
        if (!placeId) return { lat: null, lng: null };
        return this.propertiesService.getPlaceDetails(placeId);
    }

    @Get('nearby')
    @ApiOperation({ summary: 'Find nearby properties by lat/lng (public)' })
    findNearby(
        @Query('lat') lat: string,
        @Query('lng') lng: string,
        @Query('radius') radius?: string,
    ) {
        return this.propertiesService.findNearby(
            parseFloat(lat),
            parseFloat(lng),
            radius ? parseFloat(radius) : 100,
        );
    }

    @Get('reverse-geocode')
    @ApiOperation({ summary: 'Reverse geocode lat/lng to city name via Google API (public)' })
    reverseGeocode(
        @Query('lat') lat: string,
        @Query('lng') lng: string,
    ) {
        return this.propertiesService.reverseGeocode(
            parseFloat(lat),
            parseFloat(lng),
        );
    }

    @Get(':slug')
    @ApiOperation({ summary: 'Get property by slug (public)' })
    findBySlug(@Param('slug') slug: string) {
        return this.propertiesService.findBySlug(slug);
    }

    // ============================================
    // AUTHENTICATED ENDPOINTS
    // ============================================

    @Post()
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.PROPERTIES.CREATE)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new property' })
    create(@Request() req, @Body() data: CreatePropertyDto) {
        return this.propertiesService.create(req.user, data);
    }

    @Get('my/properties')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.PROPERTIES.READ)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get properties owned by current user' })
    findOwned(@Request() req) {
        return this.propertiesService.findByOwner(req.user.id);
    }

    @Get('id/:id')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get property by ID (owner, staff, or admin only)' })
    findById(@Param('id') id: string, @Request() req) {
        return this.propertiesService.findById(id, req.user);
    }

    @Get('id/:id/readiness')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get lightweight property readiness stats' })
    getReadiness(@Param('id') id: string) {
        return this.propertiesService.getReadiness(id);
    }

    @Put(':id')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.PROPERTIES.UPDATE)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update a property' })
    update(
        @Param('id') id: string,
        @Request() req,
        @Body() data: UpdatePropertyDto,
    ) {
        return this.propertiesService.update(id, req.user, data);
    }

    @Delete(':id')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.PROPERTIES.DELETE)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete a property' })
    delete(@Param('id') id: string, @Request() req) {
        return this.propertiesService.delete(id, req.user.id);
    }

    // ============================================
    // ADMIN ENDPOINTS
    // ============================================

    @Get('admin/all')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'List all properties including inactive (Admin/Owner/Staff)' })
    findAllAdmin(@Request() req, @Query() query: PropertyQueryDto) {
        return this.propertiesService.findAllAdmin(req.user, query);
    }

    @Patch(':id/status')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.PROPERTIES.APPROVE)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Approve/Reject/Update property status (Maker-Checker enforced)' })
    updateStatus(
        @Param('id') id: string,
        @Request() req,
        @Body('status') status: PropertyStatus,
    ) {
        return this.propertiesService.updateStatus(id, req.user, status);
    }

    @Put(':id/toggle-active')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.PROPERTIES.UPDATE)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Toggle property active status (Admin)' })
    toggleActive(@Param('id') id: string, @Body('isActive') isActive: boolean) {
        return this.propertiesService.toggleActive(id, isActive);
    }

    @Put(':id/toggle-pms')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.PROPERTIES.UPDATE)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Toggle property PMS active status (Admin)' })
    togglePms(@Param('id') id: string, @Body('isPmsActive') isPmsActive: boolean) {
        return this.propertiesService.togglePms(id, isPmsActive);
    }

    @Post(':id/reset-owner-password')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.PROPERTIES.UPDATE)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Reset owner password (Admin)' })
    resetOwnerPassword(
        @Param('id') id: string,
        @Body('email') email: string,
        @Body('password') password?: string,
    ) {
        return this.propertiesService.resetOwnerPassword(id, email, password);
    }

    // ============================================
    // INTELLIGENCE (IMPERSONATION)
    // ============================================

    @Post(':id/impersonate')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.ADMIN.IMPERSONATE_PROPERTY)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Enter property dashboard (Super Admin Impersonation)' })
    impersonate(@Param('id') id: string, @Request() req) {
        // Implementation logic: Log the action and return property-scoped context
        return this.propertiesService.impersonate(req.user, id);
    }

    // ============================================
    // OCCUPANCY RENOVATION: READINESS & SHADOW VALIDATION
    // ============================================

    @Get(':id/occupancy-readiness')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.PROPERTIES.READ)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Audit property V2 occupancy readiness (Read-Only)' })
    getOccupancyReadiness(@Param('id') id: string) {
        return this.propertiesService.getOccupancyReadiness(id);
    }

    @Get(':id/occupancy-shadow-validation')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.PROPERTIES.READ)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Shadow validation of V1 vs V2 occupancy and pricing (Read-Only)' })
    getOccupancyShadowValidation(@Param('id') id: string) {
        return this.propertiesService.getOccupancyShadowValidation(id);
    }

    @Patch(':id/occupancy-version/activate')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.PROPERTIES.UPDATE)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Atomically activate Property to V2 Canonical Occupancy' })
    activateV2Occupancy(@Param('id') id: string, @Request() req) {
        return this.propertiesService.activateV2Occupancy(id, req?.user);
    }

    @Patch(':id/occupancy-version/deactivate')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.PROPERTIES.UPDATE)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Revert Property to V1 Legacy Occupancy' })
    deactivateV2Occupancy(@Param('id') id: string, @Request() req) {
        return this.propertiesService.deactivateV2Occupancy(id, req?.user);
    }
}

