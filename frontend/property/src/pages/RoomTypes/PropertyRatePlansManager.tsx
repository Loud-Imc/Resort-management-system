import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Utensils, Plus, Star, Edit2, Trash2,
  Snowflake, Wind, Info, Save, Loader2, Sparkles, ChevronDown, ChevronUp
} from 'lucide-react';
import {
  ratePlansService,
  type RatePlan,
  type MealPlan,
  type RatePlanPricingType,
} from '../../services/ratePlans';
import type { RoomType } from '../../types/room';
import toast from 'react-hot-toast';

interface PropertyRatePlansManagerProps {
  propertyId: string;
  roomTypes: RoomType[];
}

export const PropertyRatePlansManager: React.FC<PropertyRatePlansManagerProps> = ({
  propertyId,
  roomTypes,
}) => {
  const queryClient = useQueryClient();
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<RatePlan | null>(null);

  // Local prices edit state: key is `${ratePlanId}_${roomTypeId}`
  const [priceEdits, setPriceEdits] = useState<Record<string, {
    basePrice: number;
    basePriceAc: number | null;
    extraAdultPrice: number;
    extraChildPrice: number;
  }>>({});
  const [savingPlanId, setSavingPlanId] = useState<string | null>(null);

  // Fetch all property rate plans
  const { data: ratePlans, isLoading, refetch } = useQuery<RatePlan[]>({
    queryKey: ['propertyRatePlans', propertyId],
    queryFn: () => ratePlansService.getRatePlansForProperty(propertyId),
    enabled: !!propertyId,
  });

  // Auto-expand first (primary) rate plan when data loads
  useEffect(() => {
    if (ratePlans && ratePlans.length > 0 && !expandedPlanId) {
      const primary = ratePlans.find(p => p.isPrimary) || ratePlans[0];
      setExpandedPlanId(primary.id);
    }
  }, [ratePlans]);

  // Set primary mutation
  const setPrimaryMutation = useMutation({
    mutationFn: (id: string) => ratePlansService.updateRatePlan(id, { isPrimary: true }),
    onSuccess: () => {
      toast.success('Primary rate plan updated');
      queryClient.invalidateQueries({ queryKey: ['propertyRatePlans', propertyId] });
      queryClient.invalidateQueries({ queryKey: ['roomTypes'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to set primary rate plan');
    },
  });

  // Delete rate plan mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => ratePlansService.deleteRatePlan(id),
    onSuccess: () => {
      toast.success('Rate plan deactivated');
      queryClient.invalidateQueries({ queryKey: ['propertyRatePlans', propertyId] });
      queryClient.invalidateQueries({ queryKey: ['roomTypes'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to deactivate rate plan');
    },
  });

  // Save room prices for a rate plan
  const handleSavePrices = async (planId: string) => {
    setSavingPlanId(planId);
    try {
      const targetPlan = ratePlans?.find(p => p.id === planId);
      if (!targetPlan) return;

      const updatedPrices: any[] = roomTypes.map(rt => {
        const key = `${planId}_${rt.id}`;
        const existing = targetPlan.roomTypePrices?.find(p => p.roomTypeId === rt.id);
        const edit = priceEdits[key];

        const basePrice = edit?.basePrice !== undefined ? edit.basePrice : Number(existing?.basePrice ?? rt.basePrice ?? 1000);
        const basePriceAc = edit?.basePriceAc !== undefined ? edit.basePriceAc : (existing?.basePriceAc !== undefined ? existing.basePriceAc : (rt.basePriceAc ?? null));
        const extraAdultPrice = edit?.extraAdultPrice !== undefined ? edit.extraAdultPrice : Number(existing?.extraAdultPrice ?? rt.extraAdultPrice ?? 500);
        const extraChildPrice = edit?.extraChildPrice !== undefined ? edit.extraChildPrice : Number(existing?.extraChildPrice ?? rt.extraChildPrice ?? 250);

        return {
          roomTypeId: rt.id,
          basePrice,
          basePriceAc: rt.acOption === 'NON_AC_ONLY' ? null : basePriceAc,
          extraAdultPrice,
          extraChildPrice,
        };
      });

      await ratePlansService.updateRoomTypePrices(planId, updatedPrices);
      toast.success('Room tariffs updated for this rate plan');
      await refetch();
      queryClient.invalidateQueries({ queryKey: ['roomTypes'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update prices');
    } finally {
      setSavingPlanId(null);
    }
  };

  // Reset / Consolidate mutation
  const resetMutation = useMutation({
    mutationFn: () => ratePlansService.resetPropertyRatePlans(propertyId),
    onSuccess: () => {
      toast.success('Rate plans consolidated to standard 4 tiers (EP, CP, MAP, AP)!');
      queryClient.invalidateQueries({ queryKey: ['propertyRatePlans', propertyId] });
      queryClient.invalidateQueries({ queryKey: ['roomTypes'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to consolidate rate plans');
    },
  });

  const getMealBadge = (mp: MealPlan) => {
    switch (mp) {
      case 'EP':
        return { label: 'EP - Room Only', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: '☕' };
      case 'CP':
        return { label: 'CP - Bed & Breakfast', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', icon: '🍳' };
      case 'MAP':
        return { label: 'MAP - Half Board', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', icon: '🍽️' };
      case 'AP':
        return { label: 'AP - Full Board', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20', icon: '👑' };
      default:
        return { label: mp, color: 'bg-gray-500/10 text-gray-600 border-gray-500/20', icon: '🍽️' };
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-card rounded-2xl border border-border">
        <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
        <p className="text-sm font-bold text-muted-foreground">Loading Property Rate Plans...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Explanation */}
      <div className="bg-gradient-to-r from-indigo-500/10 via-primary/5 to-emerald-500/10 border border-primary/20 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-primary/10 text-primary rounded-xl shrink-0 mt-0.5">
            <Utensils className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-foreground flex items-center gap-2">
              Property Rate Plans & Meal Packages
              <span className="text-[10px] uppercase font-black px-2 py-0.5 bg-primary/15 text-primary rounded-md border border-primary/25">
                Property Level
              </span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed max-w-3xl">
              Rate plans define the meal package and stay inclusions (EP Room Only, CP Breakfast, MAP Half Board, AP Full Board) available to guests across this property.
              Each room type automatically receives a specific tariff for both its Non-AC and AC variants under each plan.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            onClick={() => {
              if (window.confirm('Consolidate duplicate legacy plans and reset this property to the canonical 4 meal tiers (Room Only EP, CP, MAP, AP)?')) {
                resetMutation.mutate();
              }
            }}
            disabled={resetMutation.isPending}
            className="bg-muted hover:bg-muted/80 text-foreground text-xs font-bold px-3.5 py-2.5 rounded-xl border border-border flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
            title="Clean up legacy duplicate rate plans into the standard 4 meal tiers"
          >
            {resetMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Sparkles className="h-4 w-4 text-primary" />}
            Reset to Standard 4 Tiers (EP/CP/MAP/AP)
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-black px-4 py-2.5 rounded-xl shadow-md flex items-center gap-1.5 shrink-0 cursor-pointer transition-all"
          >
            <Plus className="h-4 w-4" />
            Create Custom Rate Plan
          </button>
        </div>
      </div>

      {/* Rate Plans List */}
      <div className="space-y-4">
        {ratePlans?.map((plan) => {
          const badge = getMealBadge(plan.mealPlan);
          const isExpanded = expandedPlanId === plan.id;
          const hasEdits = Object.keys(priceEdits).some(k => k.startsWith(`${plan.id}_`));

          return (
            <div
              key={plan.id}
              className={`bg-card rounded-2xl border transition-all shadow-sm ${
                plan.isPrimary
                  ? 'border-primary/50 shadow-primary/5'
                  : 'border-border hover:border-border/80'
              }`}
            >
              {/* Plan Card Header */}
              <div
                className="p-4 md:p-5 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none"
                onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="text-xl">{badge.icon}</div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-black text-foreground">{plan.name}</h3>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${badge.color}`}>
                        {badge.label}
                      </span>
                      {plan.isPrimary && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/25 flex items-center gap-1">
                          <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                          Default Stay Offer
                        </span>
                      )}
                      {plan.code && (
                        <span className="text-[10px] font-mono font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {plan.code}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {plan.pricingType === 'ABSOLUTE'
                        ? 'Custom fixed tariff per room category'
                        : `Derived offer: ${plan.derivedAmount ? `+₹${plan.derivedAmount}` : `+${plan.derivedPercentage}%`}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {!plan.isPrimary && (
                    <button
                      type="button"
                      onClick={() => setPrimaryMutation.mutate(plan.id)}
                      disabled={setPrimaryMutation.isPending}
                      className="px-2.5 py-1.5 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground text-xs font-bold rounded-lg border border-border transition-all flex items-center gap-1 cursor-pointer"
                      title="Set as property default stay offer"
                    >
                      <Star className="h-3.5 w-3.5" />
                      Set as Primary
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setEditingPlan(plan)}
                    className="p-1.5 text-muted-foreground hover:text-primary rounded-lg hover:bg-muted transition-colors cursor-pointer"
                    title="Edit Plan Details"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>

                  {!plan.isPrimary && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Deactivate '${plan.name}' for this property?`)) {
                          deleteMutation.mutate(plan.id);
                        }
                      }}
                      className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-muted transition-colors cursor-pointer"
                      title="Deactivate Plan"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}

                  <div className="p-1 text-muted-foreground">
                    {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </div>
                </div>
              </div>

              {/* Collapsible Room Tariffs Table */}
              {isExpanded && (
                <div className="px-4 pb-4 md:px-5 md:pb-5 pt-2 border-t border-border/60">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs font-bold text-muted-foreground">
                      Room Category Tariffs under <span className="text-foreground font-black">{plan.name}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSavePrices(plan.id)}
                      disabled={savingPlanId === plan.id}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                        hasEdits
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse'
                          : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                      }`}
                    >
                      {savingPlanId === plan.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      Save Rates for {plan.mealPlan}
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-muted/50 border-b border-border text-muted-foreground font-black uppercase text-[10px] tracking-wider">
                          <th className="py-2.5 px-3">Room Category</th>
                          <th className="py-2.5 px-3">Comfort Mode</th>
                          <th className="py-2.5 px-3">Non-AC Base Price</th>
                          <th className="py-2.5 px-3">AC Base Price</th>
                          <th className="py-2.5 px-3">Extra Adult</th>
                          <th className="py-2.5 px-3">Extra Child</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {roomTypes.map((rt) => {
                          const existingPrice = plan.roomTypePrices?.find(p => p.roomTypeId === rt.id);
                          const editKey = `${plan.id}_${rt.id}`;
                          const currentEdit = priceEdits[editKey];

                          const baseVal = currentEdit?.basePrice !== undefined
                            ? currentEdit.basePrice
                            : Number(existingPrice?.basePrice ?? rt.basePrice ?? 1000);

                          const baseAcVal = currentEdit?.basePriceAc !== undefined
                            ? currentEdit.basePriceAc
                            : (existingPrice?.basePriceAc !== undefined ? existingPrice.basePriceAc : (rt.basePriceAc ?? null));

                          const extraAdultVal = currentEdit?.extraAdultPrice !== undefined
                            ? currentEdit.extraAdultPrice
                            : Number(existingPrice?.extraAdultPrice ?? rt.extraAdultPrice ?? 500);

                          const extraChildVal = currentEdit?.extraChildPrice !== undefined
                            ? currentEdit.extraChildPrice
                            : Number(existingPrice?.extraChildPrice ?? rt.extraChildPrice ?? 250);

                          const isAcCapable = rt.acOption === 'AC_ONLY' || rt.acOption === 'BOTH';
                          const isNonAcCapable = rt.acOption === 'NON_AC_ONLY' || rt.acOption === 'BOTH';

                          return (
                            <tr key={rt.id} className="hover:bg-muted/20 transition-colors">
                              <td className="py-2 px-3 font-black text-foreground">
                                {rt.name}
                              </td>

                              <td className="py-2 px-3">
                                {rt.acOption === 'BOTH' ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
                                    <Snowflake className="h-3 w-3 text-cyan-600" />
                                    <Wind className="h-3 w-3 text-emerald-600" />
                                    Dual (AC & Non-AC)
                                  </span>
                                ) : rt.acOption === 'AC_ONLY' ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                                    <Snowflake className="h-3 w-3 text-blue-600" />
                                    AC Only
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                    <Wind className="h-3 w-3 text-emerald-600" />
                                    Non-AC Only
                                  </span>
                                )}
                              </td>

                              {/* Non-AC Base Price */}
                              <td className="py-2 px-3">
                                {isNonAcCapable ? (
                                  <div className="flex items-center gap-1">
                                    <span className="text-muted-foreground font-bold">₹</span>
                                    <input
                                      type="number"
                                      value={baseVal}
                                      onChange={(e) => {
                                        const val = Number(e.target.value);
                                        setPriceEdits(prev => ({
                                          ...prev,
                                          [editKey]: {
                                            basePrice: val,
                                            basePriceAc: baseAcVal,
                                            extraAdultPrice: extraAdultVal,
                                            extraChildPrice: extraChildVal,
                                          }
                                        }));
                                      }}
                                      className="w-24 px-2 py-1 bg-background border border-border rounded-lg text-xs font-black text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                                    />
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-[11px] italic">N/A (AC Only)</span>
                                )}
                              </td>

                              {/* AC Base Price */}
                              <td className="py-2 px-3">
                                {isAcCapable ? (
                                  <div className="flex items-center gap-1">
                                    <span className="text-cyan-600 font-bold">₹</span>
                                    <input
                                      type="number"
                                      value={baseAcVal ?? (baseVal + 500)}
                                      onChange={(e) => {
                                        const val = Number(e.target.value);
                                        setPriceEdits(prev => ({
                                          ...prev,
                                          [editKey]: {
                                            basePrice: baseVal,
                                            basePriceAc: val,
                                            extraAdultPrice: extraAdultVal,
                                            extraChildPrice: extraChildVal,
                                          }
                                        }));
                                      }}
                                      className="w-24 px-2 py-1 bg-cyan-500/5 border border-cyan-500/30 rounded-lg text-xs font-black text-cyan-800 dark:text-cyan-200 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                                    />
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-[11px] italic">N/A (Non-AC Only)</span>
                                )}
                              </td>

                              {/* Extra Adult */}
                              <td className="py-2 px-3">
                                <div className="flex items-center gap-1">
                                  <span className="text-muted-foreground font-bold">₹</span>
                                  <input
                                    type="number"
                                    value={extraAdultVal}
                                    onChange={(e) => {
                                      const val = Number(e.target.value);
                                      setPriceEdits(prev => ({
                                        ...prev,
                                        [editKey]: {
                                          basePrice: baseVal,
                                          basePriceAc: baseAcVal,
                                          extraAdultPrice: val,
                                          extraChildPrice: extraChildVal,
                                        }
                                      }));
                                    }}
                                    className="w-20 px-2 py-1 bg-background border border-border rounded-lg text-xs font-bold text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                                  />
                                </div>
                              </td>

                              {/* Extra Child */}
                              <td className="py-2 px-3">
                                <div className="flex items-center gap-1">
                                  <span className="text-muted-foreground font-bold">₹</span>
                                  <input
                                    type="number"
                                    value={extraChildVal}
                                    onChange={(e) => {
                                      const val = Number(e.target.value);
                                      setPriceEdits(prev => ({
                                        ...prev,
                                        [editKey]: {
                                          basePrice: baseVal,
                                          basePriceAc: baseAcVal,
                                          extraAdultPrice: extraAdultVal,
                                          extraChildPrice: val,
                                        }
                                      }));
                                    }}
                                    className="w-20 px-2 py-1 bg-background border border-border rounded-lg text-xs font-bold text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                                  />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal: Create Property Rate Plan */}
      {isCreateModalOpen && (
        <CreateRatePlanModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          propertyId={propertyId}
          roomTypes={roomTypes}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            refetch();
          }}
        />
      )}

      {/* Modal: Edit Rate Plan Metadata */}
      {editingPlan && (
        <EditRatePlanModal
          isOpen={!!editingPlan}
          plan={editingPlan}
          onClose={() => setEditingPlan(null)}
          onSuccess={() => {
            setEditingPlan(null);
            refetch();
          }}
        />
      )}
    </div>
  );
};

// ----------------------------------------------------------------------
// Subcomponent: Create Property Rate Plan Modal
// ----------------------------------------------------------------------
interface CreateRatePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  roomTypes: RoomType[];
  onSuccess: () => void;
}

const CreateRatePlanModal: React.FC<CreateRatePlanModalProps> = ({
  // isOpen,
  onClose,
  propertyId,
  roomTypes,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [mealPlan, setMealPlan] = useState<MealPlan>('CP');
  const [pricingType, setPricingType] = useState<RatePlanPricingType>('ABSOLUTE');
  const [isPrimary, setIsPrimary] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Default meal plan offset recommendations
  const getOffsetForMeal = (mp: MealPlan) => {
    switch (mp) {
      case 'EP': return 0;
      case 'CP': return 400;
      case 'MAP': return 1000;
      case 'AP': return 1600;
      default: return 0;
    }
  };

  const handleMealChange = (newMeal: MealPlan) => {
    setMealPlan(newMeal);
    if (!name || name.includes('Plan') || name.includes('Package')) {
      const suffixes: Record<MealPlan, string> = {
        EP: 'Room Only (EP)',
        CP: 'Bed & Breakfast (CP)',
        MAP: 'Half Board (MAP)',
        AP: 'Full Board (AP)',
      };
      setName(`Standard ${suffixes[newMeal]}`);
      setCode(newMeal);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter a name for the rate plan');
      return;
    }

    setIsSubmitting(true);
    try {
      const offset = getOffsetForMeal(mealPlan);
      const roomTypePrices = roomTypes.map((rt) => {
        const baseNonAc = Number(rt.basePrice || 1000) + offset;
        const baseAc = rt.basePriceAc !== null && rt.basePriceAc !== undefined
          ? Number(rt.basePriceAc) + offset
          : null;

        return {
          roomTypeId: rt.id,
          basePrice: baseNonAc,
          basePriceAc: rt.acOption === 'NON_AC_ONLY' ? null : baseAc,
          extraAdultPrice: Number(rt.extraAdultPrice || 500),
          extraChildPrice: Number(rt.extraChildPrice || 250),
        };
      });

      await ratePlansService.createRatePlan({
        propertyId,
        name: name.trim(),
        code: code.trim() || undefined,
        mealPlan,
        isPrimary,
        pricingType,
        roomTypePrices,
      });

      toast.success(`Created ${name} successfully`);
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create rate plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <Utensils className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-foreground">Create Property Rate Plan</h3>
              <p className="text-xs text-muted-foreground">Adds a global meal or stay package for this property</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-sm font-bold">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-black text-foreground mb-1.5 uppercase tracking-wider">
              Meal Package Entitlement
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { code: 'EP' as const, label: 'EP - Room Only', icon: '☕' },
                { code: 'CP' as const, label: 'CP - Breakfast', icon: '🍳' },
                { code: 'MAP' as const, label: 'MAP - Half Board', icon: '🍽️' },
                { code: 'AP' as const, label: 'AP - Full Board', icon: '👑' },
              ].map((m) => (
                <button
                  type="button"
                  key={m.code}
                  onClick={() => handleMealChange(m.code)}
                  className={`p-2.5 rounded-xl border text-xs font-black flex items-center gap-2 cursor-pointer transition-all ${
                    mealPlan === m.code
                      ? 'bg-primary/10 border-primary text-primary shadow-sm ring-1 ring-primary'
                      : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <span className="text-base">{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-foreground mb-1 uppercase tracking-wider">
              Plan Display Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Continental Bed & Breakfast (CP)"
              className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-bold text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-foreground mb-1 uppercase tracking-wider">
                Internal Code (Optional)
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. CP-SUMMER"
                className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-mono font-bold text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-foreground mb-1 uppercase tracking-wider">
                Pricing Calculation
              </label>
              <select
                value={pricingType}
                onChange={(e) => setPricingType(e.target.value as RatePlanPricingType)}
                className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-bold text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="ABSOLUTE">Fixed Rate per Category</option>
                <option value="DERIVED">Derived from Primary</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isPrimaryCheck"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary"
            />
            <label htmlFor="isPrimaryCheck" className="text-xs font-bold text-foreground cursor-pointer">
              Set as Property Default Stay Offer (Primary EP)
            </label>
          </div>

          <div className="bg-muted/40 p-3 rounded-xl border border-border text-[11px] text-muted-foreground flex items-start gap-2">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <span>
              Initial tariffs will automatically be populated from your room categories with recommended meal offsets.
              You can fine-tune every room's Non-AC and AC price right on the next screen.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-black rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Create Rate Plan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// Subcomponent: Edit Rate Plan Metadata Modal
// ----------------------------------------------------------------------
interface EditRatePlanModalProps {
  isOpen: boolean;
  plan: RatePlan;
  onClose: () => void;
  onSuccess: () => void;
}

const EditRatePlanModal: React.FC<EditRatePlanModalProps> = ({
  // isOpen,
  plan,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState(plan.name);
  const [code, setCode] = useState(plan.code || '');
  const [mealPlan, setMealPlan] = useState<MealPlan>(plan.mealPlan);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await ratePlansService.updateRatePlan(plan.id, {
        name: name.trim(),
        code: code.trim() || undefined,
        mealPlan,
      });
      toast.success('Rate plan updated');
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update rate plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-base font-black text-foreground">Edit Rate Plan Details</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-sm font-bold">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-black text-foreground mb-1 uppercase tracking-wider">
              Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-bold text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-foreground mb-1 uppercase tracking-wider">
              Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-mono font-bold text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-foreground mb-1 uppercase tracking-wider">
              Meal Package Entitlement
            </label>
            <select
              value={mealPlan}
              onChange={(e) => setMealPlan(e.target.value as MealPlan)}
              className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-bold text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
            >
              <option value="EP">EP - Room Only</option>
              <option value="CP">CP - Bed & Breakfast</option>
              <option value="MAP">MAP - Half Board (Breakfast + Lunch/Dinner)</option>
              <option value="AP">AP - Full Board (All Meals)</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-black rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
