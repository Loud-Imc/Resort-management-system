import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Utensils, Plus, Star, Edit2, Trash2,
  Snowflake, Wind, Info, Save, Loader2, Sparkles, ChevronDown, ChevronUp, CheckCircle2
} from 'lucide-react';
import {
  ratePlansService,
  type RatePlan,
  type MealPlan,
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

  // Per-plan meal supplement edit state: planId -> { adultMealRate, childMealRate }
  const [mealRateEdits, setMealRateEdits] = useState<Record<string, { adult: number; child: number }>>({});
  const [savingPlanId, setSavingPlanId] = useState<string | null>(null);

  // Fetch all property rate plans
  const { data: ratePlans, isLoading, refetch } = useQuery<RatePlan[]>({
    queryKey: ['propertyRatePlans', propertyId],
    queryFn: () => ratePlansService.getRatePlansForProperty(propertyId),
    enabled: !!propertyId,
  });

  // Initialize mealRateEdits when ratePlans load
  useEffect(() => {
    if (ratePlans) {
      const initial: Record<string, { adult: number; child: number }> = {};
      ratePlans.forEach((p) => {
        initial[p.id] = {
          adult: Number(p.extraAdultPrice || 0),
          child: Number(p.extraChildPrice || 0),
        };
      });
      setMealRateEdits(initial);
    }
  }, [ratePlans]);

  // Set primary mutation
  const setPrimaryMutation = useMutation({
    mutationFn: (id: string) => ratePlansService.updateRatePlan(id, { isPrimary: true }),
    onSuccess: () => {
      toast.success('Default stay offer updated');
      queryClient.invalidateQueries({ queryKey: ['propertyRatePlans', propertyId] });
      queryClient.invalidateQueries({ queryKey: ['roomTypes'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to set default rate plan');
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

  // Save meal supplement rates for a rate plan
  const handleSaveMealRates = async (planId: string) => {
    setSavingPlanId(planId);
    try {
      const rates = mealRateEdits[planId] || { adult: 0, child: 0 };
      await ratePlansService.updateRatePlan(planId, {
        extraAdultPrice: rates.adult,
        extraChildPrice: rates.child,
      });

      toast.success('Meal supplement rates saved and applied to all room categories!');
      await refetch();
      queryClient.invalidateQueries({ queryKey: ['roomTypes'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save meal rates');
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
              Property Meal Packages & Rate Plans
              <span className="text-[10px] uppercase font-black px-2 py-0.5 bg-primary/15 text-primary rounded-md border border-primary/25">
                Global Property Level
              </span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed max-w-3xl">
              Set per-head meal supplements (Adult & Child) for each plan. The final guest price is automatically calculated as:
              <strong className="text-foreground font-semibold"> Room Tariff (Non-AC or AC) + Meal Supplement</strong>.
              No need to maintain tedious per-room price tables.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            onClick={() => {
              if (window.confirm('Reset this property to standard 4 tiers (Room Only EP, Bed & Breakfast CP, Half Board MAP, Full Board AP)?')) {
                resetMutation.mutate();
              }
            }}
            disabled={resetMutation.isPending}
            className="bg-muted hover:bg-muted/80 text-foreground text-xs font-bold px-3.5 py-2.5 rounded-xl border border-border flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
            title="Consolidates duplicate plans into the canonical 4 Indian hospitality tiers"
          >
            {resetMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Sparkles className="h-4 w-4 text-primary" />}
            Reset to Standard 4 Tiers
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
          const currentRates = mealRateEdits[plan.id] || {
            adult: Number(plan.extraAdultPrice || 0),
            child: Number(plan.extraChildPrice || 0),
          };
          const isEp = plan.mealPlan === 'EP';

          const hasUnsavedChanges =
            currentRates.adult !== Number(plan.extraAdultPrice || 0) ||
            currentRates.child !== Number(plan.extraChildPrice || 0);

          return (
            <div
              key={plan.id}
              className={`bg-card rounded-2xl border transition-all shadow-sm ${
                plan.isPrimary
                  ? 'border-primary/50 shadow-primary/5 ring-1 ring-primary/20'
                  : 'border-border hover:border-border/80'
              }`}
            >
              {/* Plan Card Header */}
              <div className="p-4 md:p-5 flex flex-wrap items-center justify-between gap-3 border-b border-border/50">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="text-2xl p-2 bg-muted/50 rounded-xl">{badge.icon}</div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-black text-foreground">{plan.name}</h3>
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
                      {isEp
                        ? 'Pure room tariff (no meals included). Base prices are managed directly in Room Types.'
                        : `Meal price: ₹${currentRates.adult}/adult and ₹${currentRates.child}/child per night.`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!plan.isPrimary && (
                    <button
                      type="button"
                      onClick={() => setPrimaryMutation.mutate(plan.id)}
                      disabled={setPrimaryMutation.isPending}
                      className="px-2.5 py-1.5 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground text-xs font-bold rounded-lg border border-border transition-all flex items-center gap-1 cursor-pointer"
                      title="Set as property default stay offer (preselected for guests)"
                    >
                      <Star className="h-3.5 w-3.5" />
                      Set as Primary
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setEditingPlan(plan)}
                    className="p-1.5 text-muted-foreground hover:text-primary rounded-lg hover:bg-muted transition-colors cursor-pointer"
                    title="Edit Plan Name & Code"
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
                </div>
              </div>

              {/* Plan Body: Meal Supplement Inputs */}
              <div className="p-4 md:p-5 bg-muted/10 space-y-4">
                {isEp ? (
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3.5 flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0" />
                    <div className="text-xs text-muted-foreground">
                      <strong className="text-foreground">European Plan (Room Only):</strong> Meal supplement is ₹0.
                      Guests paying for EP pay only the room tariff (Non-AC or AC) configured on each Room Type.
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
                    {/* Adult Meal Price */}
                    <div className="bg-card p-3 rounded-xl border border-border">
                      <label className="block text-[11px] font-black uppercase tracking-wider text-muted-foreground mb-1">
                        Adult Meal Price
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-muted-foreground">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="10"
                          value={currentRates.adult}
                          onChange={(e) => {
                            const val = Math.max(0, Number(e.target.value) || 0);
                            setMealRateEdits((prev) => ({
                              ...prev,
                              [plan.id]: { adult: val, child: currentRates.child },
                            }));
                          }}
                          className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm font-black text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                        <span className="text-xs text-muted-foreground shrink-0 font-medium">/ adult / night</span>
                      </div>
                    </div>

                    {/* Child Meal Price */}
                    <div className="bg-card p-3 rounded-xl border border-border">
                      <label className="block text-[11px] font-black uppercase tracking-wider text-muted-foreground mb-1">
                        Child Meal Price
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-muted-foreground">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="10"
                          value={currentRates.child}
                          onChange={(e) => {
                            const val = Math.max(0, Number(e.target.value) || 0);
                            setMealRateEdits((prev) => ({
                              ...prev,
                              [plan.id]: { adult: currentRates.adult, child: val },
                            }));
                          }}
                          className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm font-black text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                        <span className="text-xs text-muted-foreground shrink-0 font-medium">/ child / night</span>
                      </div>
                    </div>

                    {/* Save Button */}
                    <div>
                      <button
                        type="button"
                        onClick={() => handleSaveMealRates(plan.id)}
                        disabled={savingPlanId === plan.id}
                        className={`w-full py-2.5 px-4 text-xs font-black rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer ${
                          hasUnsavedChanges
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse'
                            : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                        }`}
                      >
                        {savingPlanId === plan.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        {hasUnsavedChanges ? 'Save Meal Prices *' : 'Update Meal Prices'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Calculation Formula Banner */}
                <div className="bg-card/80 border border-border/60 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-primary shrink-0" />
                    <span>
                      {isEp
                        ? 'Formula: Final Price = Room Price (Non-AC / AC)'
                        : `Formula: Final Price = Room Price + (Adults × ₹${currentRates.adult}) + (Children × ₹${currentRates.child}) per night`}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer select-none"
                  >
                    {isExpanded ? (
                      <>Hide Room Tariffs Preview <ChevronUp className="h-4 w-4" /></>
                    ) : (
                      <>View Resulting Tariffs for All Rooms <ChevronDown className="h-4 w-4" /></>
                    )}
                  </button>
                </div>

                {/* Collapsible Auto-Calculated Room Tariffs Preview */}
                {isExpanded && (
                  <div className="pt-2">
                    <div className="overflow-x-auto rounded-xl border border-border bg-card">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-muted/50 border-b border-border text-muted-foreground font-black uppercase text-[10px] tracking-wider">
                            <th className="py-2.5 px-3">Room Category</th>
                            <th className="py-2.5 px-3">Comfort Mode</th>
                            <th className="py-2.5 px-3">Non-AC Tariff</th>
                            <th className="py-2.5 px-3">AC Tariff</th>
                            <th className="py-2.5 px-3">Extra Adult</th>
                            <th className="py-2.5 px-3">Extra Child</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {roomTypes.map((rt) => {
                            const baseAdults = Number(rt.baseAdults) || 2;
                            const adultMealTotal = currentRates.adult * baseAdults;

                            const nonAcBase = Number(rt.basePrice || 0);
                            const acBase = rt.basePriceAc !== null && rt.basePriceAc !== undefined ? Number(rt.basePriceAc) : null;

                            const finalNonAc = nonAcBase + adultMealTotal;
                            const finalAc = acBase !== null ? acBase + adultMealTotal : null;

                            const extraAdultTotal = Number(rt.extraAdultPrice || 0) + currentRates.adult;
                            const extraChildTotal = Number(rt.extraChildPrice || 0) + currentRates.child;

                            const isAcCapable = rt.acOption === 'AC_ONLY' || rt.acOption === 'BOTH';
                            const isNonAcCapable = rt.acOption === 'NON_AC_ONLY' || rt.acOption === 'BOTH';

                            return (
                              <tr key={rt.id} className="hover:bg-muted/20 transition-colors">
                                <td className="py-2.5 px-3 font-black text-foreground">
                                  {rt.name}
                                  <span className="block text-[10px] font-normal text-muted-foreground">
                                    Base: {baseAdults} Adults
                                  </span>
                                </td>

                                <td className="py-2.5 px-3">
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

                                <td className="py-2.5 px-3">
                                  {isNonAcCapable ? (
                                    <div>
                                      <span className="font-black text-foreground text-sm">₹{finalNonAc.toLocaleString()}</span>
                                      {!isEp && (
                                        <span className="block text-[10px] text-muted-foreground">
                                          (₹{nonAcBase} + ₹{adultMealTotal} meal)
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground text-[11px] italic">N/A</span>
                                  )}
                                </td>

                                <td className="py-2.5 px-3">
                                  {isAcCapable && finalAc !== null ? (
                                    <div>
                                      <span className="font-black text-cyan-700 dark:text-cyan-300 text-sm">₹{finalAc.toLocaleString()}</span>
                                      {!isEp && (
                                        <span className="block text-[10px] text-muted-foreground">
                                          (₹{acBase} + ₹{adultMealTotal} meal)
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground text-[11px] italic">N/A</span>
                                  )}
                                </td>

                                <td className="py-2.5 px-3 font-bold text-foreground">
                                  ₹{extraAdultTotal.toLocaleString()}
                                </td>

                                <td className="py-2.5 px-3 font-bold text-foreground">
                                  ₹{extraChildTotal.toLocaleString()}
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
  onSuccess: () => void;
}

const CreateRatePlanModal: React.FC<CreateRatePlanModalProps> = ({
  onClose,
  propertyId,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [mealPlan, setMealPlan] = useState<MealPlan>('CP');
  const [extraAdultPrice, setExtraAdultPrice] = useState(400);
  const [extraChildPrice, setExtraChildPrice] = useState(200);
  const [isPrimary, setIsPrimary] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleMealChange = (newMeal: MealPlan) => {
    setMealPlan(newMeal);
    const defaults: Record<MealPlan, { name: string; adult: number; child: number }> = {
      EP: { name: 'Room Only (EP)', adult: 0, child: 0 },
      CP: { name: 'Bed & Breakfast (CP)', adult: 400, child: 200 },
      MAP: { name: 'Half Board - Breakfast & Dinner (MAP)', adult: 1000, child: 500 },
      AP: { name: 'Full Board - All Meals (AP)', adult: 1600, child: 800 },
    };
    setName(defaults[newMeal].name);
    setCode(newMeal);
    setExtraAdultPrice(defaults[newMeal].adult);
    setExtraChildPrice(defaults[newMeal].child);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter a name for the rate plan');
      return;
    }

    setIsSubmitting(true);
    try {
      await ratePlansService.createRatePlan({
        propertyId,
        name: name.trim(),
        code: code.trim() || undefined,
        mealPlan,
        extraAdultPrice: mealPlan === 'EP' ? 0 : extraAdultPrice,
        extraChildPrice: mealPlan === 'EP' ? 0 : extraChildPrice,
        isPrimary,
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
              <h3 className="text-base font-black text-foreground">Create Custom Rate Plan</h3>
              <p className="text-xs text-muted-foreground">Add a meal or stay package for this property</p>
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

            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="isPrimaryCheck"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <label htmlFor="isPrimaryCheck" className="text-xs font-bold text-foreground cursor-pointer">
                Set as Default Offer
              </label>
            </div>
          </div>

          {mealPlan !== 'EP' && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-xl border border-border">
              <div>
                <label className="block text-[11px] font-black uppercase text-muted-foreground mb-1">
                  Adult Meal Rate (₹/night)
                </label>
                <input
                  type="number"
                  min="0"
                  value={extraAdultPrice}
                  onChange={(e) => setExtraAdultPrice(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-black text-foreground"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-muted-foreground mb-1">
                  Child Meal Rate (₹/night)
                </label>
                <input
                  type="number"
                  min="0"
                  value={extraChildPrice}
                  onChange={(e) => setExtraChildPrice(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-black text-foreground"
                />
              </div>
            </div>
          )}

          <div className="bg-muted/40 p-3 rounded-xl border border-border text-[11px] text-muted-foreground flex items-start gap-2">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <span>
              All room categories will automatically calculate their final tariffs using this plan's per-head meal rates.
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
              <option value="MAP">MAP - Half Board (Breakfast + Dinner)</option>
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
