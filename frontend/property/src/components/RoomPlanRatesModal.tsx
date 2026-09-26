import React, { useState, useEffect } from 'react';
import { X, Utensils, Star, Snowflake, Wind, Save, Loader2, Info, ArrowRight } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ratePlansService, type RatePlan, type MealPlan } from '../services/ratePlans';
import type { RoomType } from '../types/room';
import toast from 'react-hot-toast';

interface RoomPlanRatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomType: RoomType;
  propertyId: string;
  onNavigateToPropertyPlans?: () => void;
}

export const RoomPlanRatesModal: React.FC<RoomPlanRatesModalProps> = ({
  isOpen,
  onClose,
  roomType,
  propertyId,
  onNavigateToPropertyPlans,
}) => {
  const queryClient = useQueryClient();
  const [savingPlanId, setSavingPlanId] = useState<string | null>(null);

  // Local state of prices: key is ratePlanId
  const [rates, setRates] = useState<Record<string, {
    basePrice: number;
    basePriceAc: number | null;
    extraAdultPrice: number;
    extraChildPrice: number;
  }>>({});

  // Fetch all property rate plans
  const { data: ratePlans, isLoading, refetch } = useQuery<RatePlan[]>({
    queryKey: ['propertyRatePlans', propertyId],
    queryFn: () => ratePlansService.getRatePlansForProperty(propertyId),
    enabled: isOpen && !!propertyId,
  });

  // Populate local rates from fetched rate plans
  useEffect(() => {
    if (ratePlans && roomType) {
      const initial: Record<string, any> = {};
      ratePlans.forEach((plan) => {
        const existing = plan.roomTypePrices?.find((p) => p.roomTypeId === roomType.id);
        initial[plan.id] = {
          basePrice: existing?.basePrice !== undefined ? Number(existing.basePrice) : Number(roomType.basePrice || 1000),
          basePriceAc: existing?.basePriceAc !== undefined ? existing.basePriceAc : (roomType.basePriceAc ?? null),
          extraAdultPrice: existing?.extraAdultPrice !== undefined ? Number(existing.extraAdultPrice) : Number(roomType.extraAdultPrice || 500),
          extraChildPrice: existing?.extraChildPrice !== undefined ? Number(existing.extraChildPrice) : Number(roomType.extraChildPrice || 250),
        };
      });
      setRates(initial);
    }
  }, [ratePlans, roomType]);

  const isAcCapable = roomType.acOption === 'AC_ONLY' || roomType.acOption === 'BOTH';
  const isNonAcCapable = roomType.acOption === 'NON_AC_ONLY' || roomType.acOption === 'BOTH';

  const handleSaveRateForPlan = async (plan: RatePlan) => {
    setSavingPlanId(plan.id);
    try {
      const current = rates[plan.id];
      if (!current) return;

      // Keep existing prices for other room types intact, update only this room type
      const otherPrices = (plan.roomTypePrices || [])
        .filter((p) => p.roomTypeId !== roomType.id)
        .map((p) => ({
          roomTypeId: p.roomTypeId,
          basePrice: Number(p.basePrice),
          basePriceAc: p.basePriceAc ?? null,
          extraAdultPrice: Number(p.extraAdultPrice ?? 0),
          extraChildPrice: Number(p.extraChildPrice ?? 0),
        }));

      const payload = [
        ...otherPrices,
        {
          roomTypeId: roomType.id,
          basePrice: current.basePrice,
          basePriceAc: isAcCapable ? current.basePriceAc : null,
          extraAdultPrice: current.extraAdultPrice,
          extraChildPrice: current.extraChildPrice,
        },
      ];

      await ratePlansService.updateRoomTypePrices(plan.id, payload);
      toast.success(`Rates for ${plan.name} saved!`);
      await refetch();
      queryClient.invalidateQueries({ queryKey: ['roomTypes'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update rates');
    } finally {
      setSavingPlanId(null);
    }
  };

  const getMealBadge = (mp: MealPlan) => {
    switch (mp) {
      case 'EP': return { label: 'EP - Room Only', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: '☕' };
      case 'CP': return { label: 'CP - Breakfast Included', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', icon: '🍳' };
      case 'MAP': return { label: 'MAP - Half Board', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', icon: '🍽️' };
      case 'AP': return { label: 'AP - Full Board', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20', icon: '👑' };
      default: return { label: mp, color: 'bg-gray-500/10 text-gray-600 border-gray-500/20', icon: '🍽️' };
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-2xl rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
              <Utensils className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-foreground">{roomType.name}</h3>
                {roomType.acOption === 'BOTH' ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 border border-cyan-500/20 flex items-center gap-1">
                    <Snowflake className="h-3 w-3" />
                    <Wind className="h-3 w-3" />
                    Dual AC
                  </span>
                ) : roomType.acOption === 'AC_ONLY' ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20 flex items-center gap-1">
                    <Snowflake className="h-3 w-3" />
                    AC Only
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1">
                    <Wind className="h-3 w-3" />
                    Non-AC Only
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pricing for this category across active Property Rate Plans
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Informational Banner */}
        <div className="px-5 py-3 bg-primary/5 border-b border-primary/15 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Info className="h-4 w-4 text-primary shrink-0" />
            <span>Rate plans (EP, CP, MAP, AP) are defined at property level. Configure tariffs for this room below.</span>
          </div>

          {onNavigateToPropertyPlans && (
            <button
              onClick={() => {
                onClose();
                onNavigateToPropertyPlans();
              }}
              className="text-primary hover:text-primary/80 font-black flex items-center gap-1 shrink-0 cursor-pointer"
            >
              Property Plans <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Content / Plan Rows */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mb-2 text-primary" />
              <p className="text-xs font-bold">Loading property plans...</p>
            </div>
          ) : ratePlans && ratePlans.length > 0 ? (
            ratePlans.map((plan) => {
              const badge = getMealBadge(plan.mealPlan);
              const cur = rates[plan.id] || {
                basePrice: Number(roomType.basePrice || 1000),
                basePriceAc: roomType.basePriceAc ?? null,
                extraAdultPrice: Number(roomType.extraAdultPrice || 500),
                extraChildPrice: Number(roomType.extraChildPrice || 250),
              };

              return (
                <div key={plan.id} className="p-4 rounded-xl border border-border bg-card/60 space-y-3 shadow-sm hover:border-border/80 transition-colors">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{badge.icon}</span>
                      <span className="text-xs font-black text-foreground">{plan.name}</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${badge.color}`}>
                        {badge.label}
                      </span>
                      {plan.isPrimary && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 flex items-center gap-1">
                          <Star className="h-3 w-3 fill-amber-500" /> Default
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSaveRateForPlan(plan)}
                      disabled={savingPlanId === plan.id}
                      className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-black rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {savingPlanId === plan.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Save Rate
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                    {/* Non-AC Price */}
                    <div>
                      <label className="block text-[10px] font-black text-muted-foreground uppercase mb-1">
                        🍃 Non-AC Base
                      </label>
                      {isNonAcCapable ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-muted-foreground">₹</span>
                          <input
                            type="number"
                            value={cur.basePrice}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setRates(prev => ({
                                ...prev,
                                [plan.id]: { ...prev[plan.id], basePrice: val }
                              }));
                            }}
                            className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs font-black text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                          />
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic">N/A</span>
                      )}
                    </div>

                    {/* AC Price */}
                    <div>
                      <label className="block text-[10px] font-black text-cyan-600 uppercase mb-1">
                        ❄️ AC Base
                      </label>
                      {isAcCapable ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-cyan-600">₹</span>
                          <input
                            type="number"
                            value={cur.basePriceAc ?? (cur.basePrice + 500)}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setRates(prev => ({
                                ...prev,
                                [plan.id]: { ...prev[plan.id], basePriceAc: val }
                              }));
                            }}
                            className="w-full px-2.5 py-1.5 bg-cyan-500/5 border border-cyan-500/30 rounded-lg text-xs font-black text-cyan-800 dark:text-cyan-200 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                          />
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic">N/A</span>
                      )}
                    </div>

                    {/* Extra Adult */}
                    <div>
                      <label className="block text-[10px] font-black text-muted-foreground uppercase mb-1">
                        Extra Adult
                      </label>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-muted-foreground">₹</span>
                        <input
                          type="number"
                          value={cur.extraAdultPrice}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setRates(prev => ({
                              ...prev,
                              [plan.id]: { ...prev[plan.id], extraAdultPrice: val }
                            }));
                          }}
                          className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs font-bold text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Extra Child */}
                    <div>
                      <label className="block text-[10px] font-black text-muted-foreground uppercase mb-1">
                        Extra Child
                      </label>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-muted-foreground">₹</span>
                        <input
                          type="number"
                          value={cur.extraChildPrice}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setRates(prev => ({
                              ...prev,
                              [plan.id]: { ...prev[plan.id], extraChildPrice: val }
                            }));
                          }}
                          className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs font-bold text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-muted-foreground text-center py-8">
              No active rate plans found for this property.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex justify-end bg-muted/20">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-bold rounded-xl"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
