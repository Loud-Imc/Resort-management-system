import React, { useState, useEffect } from 'react';
import { X, Plus, Utensils, Star, Trash2, Edit2, Snowflake, Wind, Sparkles, HelpCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { ratePlansService, type RatePlan, type MealPlan, type AcType } from '../services/ratePlans';

interface RatePlansManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomTypeId: string;
  roomTypeName: string;
  defaultBasePrice: number;
}

export const RatePlansManagerModal: React.FC<RatePlansManagerModalProps> = ({
  isOpen,
  onClose,
  roomTypeId,
  roomTypeName,
  defaultBasePrice,
}) => {
  const queryClient = useQueryClient();
  const [ratePlans, setRatePlans] = useState<RatePlan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [editingPlan, setEditingPlan] = useState<RatePlan | null>(null);

  // Form states
  const [name, setName] = useState<string>('');
  const [mealPlan, setMealPlan] = useState<MealPlan>('EP');
  const [acType, setAcType] = useState<AcType>('DEFAULT');
  const [basePrice, setBasePrice] = useState<number>(defaultBasePrice);
  const [extraAdultPrice, setExtraAdultPrice] = useState<number>(500);
  const [extraChildPrice, setExtraChildPrice] = useState<number>(250);
  const [isPrimary, setIsPrimary] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && roomTypeId) {
      fetchRatePlans();
    }
  }, [isOpen, roomTypeId]);

  const fetchRatePlans = async () => {
    setLoading(true);
    try {
      const data = await ratePlansService.getRatePlansForRoomType(roomTypeId);
      setRatePlans(data);
    } catch (err) {
      console.error('Failed to load rate plans:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddForm = () => {
    setEditingPlan(null);
    setName('');
    setMealPlan('CP');
    setAcType('DEFAULT');
    setBasePrice(defaultBasePrice + 500);
    setExtraAdultPrice(500);
    setExtraChildPrice(250);
    setIsPrimary(false);
    setShowAddForm(true);
  };

  const handlePresetCreate = (presetMeal: MealPlan, presetAc: AcType, priceOffset: number, labelSuffix: string) => {
    setEditingPlan(null);
    setName(`${roomTypeName} ${labelSuffix}`);
    setMealPlan(presetMeal);
    setAcType(presetAc);
    setBasePrice(Math.max(0, defaultBasePrice + priceOffset));
    setExtraAdultPrice(500);
    setExtraChildPrice(250);
    setIsPrimary(false);
    setShowAddForm(true);
  };

  const handleEditPlan = (plan: RatePlan) => {
    setEditingPlan(plan);
    setName(plan.name);
    setMealPlan(plan.mealPlan);
    setAcType(plan.acType || 'DEFAULT');
    setBasePrice(Number(plan.basePrice));
    setExtraAdultPrice(Number(plan.extraAdultPrice));
    setExtraChildPrice(Number(plan.extraChildPrice));
    setIsPrimary(plan.isPrimary);
    setShowAddForm(true);
  };

  const handleMakePrimary = async (plan: RatePlan) => {
    try {
      await ratePlansService.updateRatePlan(plan.id, { isPrimary: true });
      await fetchRatePlans();
      await queryClient.invalidateQueries({ queryKey: ['roomTypes'] });
      await queryClient.refetchQueries({ queryKey: ['roomTypes'] });
    } catch (err) {
      console.error('Failed to set primary rate plan:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingPlan) {
        await ratePlansService.updateRatePlan(editingPlan.id, {
          name,
          mealPlan,
          acType,
          basePrice,
          extraAdultPrice,
          extraChildPrice,
          isPrimary,
        });
      } else {
        await ratePlansService.createRatePlan({
          roomTypeId,
          name,
          mealPlan,
          acType,
          basePrice,
          extraAdultPrice,
          extraChildPrice,
          isPrimary,
          pricingType: 'ABSOLUTE',
        });
      }
      setShowAddForm(false);
      await fetchRatePlans();
      await queryClient.invalidateQueries({ queryKey: ['roomTypes'] });
      await queryClient.refetchQueries({ queryKey: ['roomTypes'] });
    } catch (err) {
      console.error('Failed to save rate plan:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to deactivate this Rate Plan?')) return;
    try {
      await ratePlansService.deleteRatePlan(id);
      await fetchRatePlans();
      await queryClient.invalidateQueries({ queryKey: ['roomTypes'] });
      await queryClient.refetchQueries({ queryKey: ['roomTypes'] });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete rate plan');
    }
  };

  const getMealBadgeColor = (mp: MealPlan) => {
    switch (mp) {
      case 'EP': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'CP': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'MAP': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'AP': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  const getMealPlanDesc = (mp: MealPlan) => {
    switch (mp) {
      case 'EP': return 'European Plan (Room Only)';
      case 'CP': return 'Continental Plan (Room + Breakfast)';
      case 'MAP': return 'Modified American Plan (Room + Breakfast + Dinner)';
      case 'AP': return 'American Plan (Full Board: Breakfast + Lunch + Dinner)';
    }
  };

  const getAcBadge = (ac?: AcType) => {
    switch (ac) {
      case 'AC':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-extrabold px-2 py-0.5 rounded-md border border-cyan-500/20">
            <Snowflake className="h-3 w-3" /> AC Rate
          </span>
        );
      case 'NON_AC':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] bg-teal-500/10 text-teal-600 dark:text-teal-400 font-extrabold px-2 py-0.5 rounded-md border border-teal-500/20">
            <Wind className="h-3 w-3" /> Non-AC Rate
          </span>
        );
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-2xl">
              <Utensils className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Rate Plans & Category Pricing</h3>
              <p className="text-xs text-muted-foreground">Manage EP, CP, MAP, AP & AC / Non-AC rate plans for {roomTypeName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Guided Explainer Banner */}
        <div className="p-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border flex items-start gap-3 text-xs">
          <div className="p-2 bg-primary/20 text-primary rounded-xl shrink-0 mt-0.5">
            <HelpCircle className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-foreground flex items-center gap-1.5">
              <span>What can you do with Rate Plans?</span>
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </h4>
            <p className="text-muted-foreground leading-relaxed">
              Rate Plans allow you to sell <strong>{roomTypeName}</strong> under different packages. Offer 
              <strong> AC vs Non-AC rates</strong>, <strong>Room Only (EP)</strong>, or <strong>Meals Included (CP/MAP/AP)</strong> 
              with individual base prices, extra guest charges, and calendar overrides.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {!showAddForm ? (
            <>
              {/* Quick Preset Generator Bar */}
              <div className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground block">
                  ⚡ 1-Click Quick Preset Generators
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handlePresetCreate('CP', 'DEFAULT', 500, 'CP (Breakfast Included)')}
                    className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> + CP (Bed & Breakfast)
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetCreate('EP', 'NON_AC', -400, 'Non-AC Standard')}
                    className="px-3 py-1.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-400 border border-teal-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Wind className="h-3.5 w-3.5" /> + Non-AC Rate Plan
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetCreate('MAP', 'AC', 1200, 'MAP (Half Board AC)')}
                    className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> + MAP (Breakfast + Dinner)
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Configured Rate Plans ({ratePlans.length})
                </span>
                <button
                  onClick={handleOpenAddForm}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-primary/90 transition-all shadow-md shadow-primary/20 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Custom Rate Plan
                </button>
              </div>

              {loading ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Loading rate plans...</div>
              ) : ratePlans.length === 0 ? (
                <div className="p-8 text-center bg-muted/20 rounded-2xl border border-dashed border-border text-sm text-muted-foreground space-y-2">
                  <p>No custom rate plans created yet.</p>
                  <p className="text-xs">Click one of the 1-Click Quick Presets above or "+ Custom Rate Plan" to start.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {ratePlans.map((plan) => (
                    <div
                      key={plan.id}
                      className="p-4 rounded-2xl bg-muted/40 border border-border flex items-center justify-between hover:border-primary/30 transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-foreground">{plan.name}</span>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md border ${getMealBadgeColor(
                              plan.mealPlan
                            )}`}
                          >
                            {plan.mealPlan}
                          </span>
                          {getAcBadge(plan.acType)}
                          {plan.isPrimary && (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-amber-500/10 text-amber-600 font-extrabold px-2 py-0.5 rounded-md border border-amber-500/20">
                              <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> Primary Base
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">{getMealPlanDesc(plan.mealPlan)}</p>
                        <div className="flex items-center gap-4 text-xs font-semibold text-foreground pt-1">
                          <span>Base: <strong className="text-emerald-600">₹{Number(plan.basePrice).toLocaleString()}</strong></span>
                          <span>Extra Adult: ₹{Number(plan.extraAdultPrice)}</span>
                          <span>Extra Child: ₹{Number(plan.extraChildPrice)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {!plan.isPrimary && (
                          <button
                            type="button"
                            onClick={() => handleMakePrimary(plan)}
                            className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                            title="Set as Primary Base Plan for this Room Type"
                          >
                            <Star className="h-3.5 w-3.5 text-amber-500" />
                            Set Primary
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleEditPlan(plan)}
                          className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        {!plan.isPrimary && (
                          <button
                            type="button"
                            onClick={() => handleDelete(plan.id)}
                            className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Deactivate"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* Add/Edit Form */
            <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h4 className="text-sm font-bold text-foreground">
                  {editingPlan ? 'Edit Rate Plan' : 'Create New Rate Plan'}
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-xs text-muted-foreground hover:text-foreground font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Rate Plan Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Deluxe Suite CP (Room + Breakfast AC)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Meal Plan Category</label>
                  <select
                    value={mealPlan}
                    onChange={(e) => {
                      const mp = e.target.value as MealPlan;
                      setMealPlan(mp);
                      if (!name || name.includes('Plan')) {
                        setName(`${roomTypeName} ${mp} (${getMealPlanDesc(mp).split(' ')[1] || mp})`);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                  >
                    <option value="EP">EP — European Plan (Room Only)</option>
                    <option value="CP">CP — Continental Plan (Room + Breakfast)</option>
                    <option value="MAP">MAP — Modified American Plan (Half Board)</option>
                    <option value="AP">AP — American Plan (Full Board)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Climate / AC Category</label>
                  <select
                    value={acType}
                    onChange={(e) => setAcType(e.target.value as AcType)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                  >
                    <option value="DEFAULT">🏨 Standard / Room Default</option>
                    <option value="AC">❄️ AC (Air Conditioned)</option>
                    <option value="NON_AC">🍃 Non-AC Rate</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Base Price (₹ / night)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={basePrice}
                    onChange={(e) => setBasePrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-bold text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Extra Adult Price (₹)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={extraAdultPrice}
                    onChange={(e) => setExtraAdultPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Extra Child Price (₹)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={extraChildPrice}
                    onChange={(e) => setExtraChildPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-foreground">
                    <input
                      type="checkbox"
                      checked={isPrimary}
                      onChange={(e) => setIsPrimary(e.target.checked)}
                      className="rounded text-primary focus:ring-primary h-4 w-4"
                    />
                    Set as Primary Base Plan for this Room Type
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2.5 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 cursor-pointer"
                >
                  {submitting ? 'Saving...' : editingPlan ? 'Update Rate Plan' : 'Create Rate Plan'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
