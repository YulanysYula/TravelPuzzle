import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  createUser,
  getCurrentUser,
  getTripsForUser,
  getUserByEmail,
  getUserById,
  logout as logoutUser,
  saveTrip,
  saveTripToCache,
  setCurrentUser,
  type Accommodation,
  type Activity,
  type Expense,
  type Transport,
  type Trip,
  type User
} from "@/utils/storage";
import { getTripsForUserFromSupabase } from '@/utils/supabase';
import { t, type Language } from "@/utils/translations";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [view, setView] = useState<"login" | "register" | "dashboard" | "plan" | "chat" | "summary">("login");
  const [messageInput, setMessageInput] = useState("");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  const [tripUsers, setTripUsers] = useState<User[]>([]);
  // Language state - loaded before user check
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem("app_language");
    return (saved === "en" || saved === "ru") ? saved as Language : "ru";
  });
  
  // Translation helper
  const translate = (key: string): string => t(key, language);
  
  const renderStatusBadge = (status?: string) => {
    if (!status) return null;
    const colors: Record<string, string> = {
      new: "bg-blue-100 text-blue-700 border border-blue-200",
      possible: "bg-yellow-100 text-yellow-700 border border-yellow-200",
      rejected: "bg-red-100 text-red-700 border border-red-200",
      approved: "bg-green-100 text-green-700 border border-green-200",
    };
    return (
      <span className={`text-[10px] uppercase tracking-wider font-black px-2 py-0.5 rounded-full shadow-sm ${colors[status] || "bg-gray-100 text-gray-700 border border-gray-200"}`}>
        {translate(`status_${status}`)}
      </span>
    );
  };
  // Login/Register form state
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  // New features state
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({ description: "", amount: "", category: "", sharedBy: [] as string[], currency: "RUB" });
  // New dialogs
  const [placeDialogOpen, setPlaceDialogOpen] = useState(false);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [accommodationDialogOpen, setAccommodationDialogOpen] = useState(false);
  const [transportDialogOpen, setTransportDialogOpen] = useState(false);
  const [editPlaceDialogOpen, setEditPlaceDialogOpen] = useState(false);
  const [editActivityDialogOpen, setEditActivityDialogOpen] = useState(false);
  const [editAccommodationDialogOpen, setEditAccommodationDialogOpen] = useState(false);
  const [editTransportDialogOpen, setEditTransportDialogOpen] = useState(false);
  const [editExpenseDialogOpen, setEditExpenseDialogOpen] = useState(false);
  const [editTripNameDialogOpen, setEditTripNameDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [newPlace, setNewPlace] = useState({ name: "", address: "", imageUrl: "", googleMapsLink: "", status: "new" as "new" | "possible" | "rejected" | "approved", currency: "EUR", price: "" });
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [newActivity, setNewActivity] = useState({ name: "", description: "", imageUrl: "", link: "", address: "", day: 1, time: "", status: "new" as "new" | "possible" | "rejected" | "approved", currency: "EUR", price: "" });
  const [newAccommodation, setNewAccommodation] = useState({ name: "", address: "", imageUrl: "", bookingLink: "", description: "", checkIn: "", checkOut: "", price: "", status: "new" as "new" | "possible" | "rejected" | "approved", currency: "EUR", guests: 1 });
  const [newTransport, setNewTransport] = useState({ type: "plane" as "plane" | "train" | "bus" | "car" | "ship" | "other", from: "", to: "", departureTime: "", departurePlace: "", arrivalTime: "", arrivalPlace: "", passengers: 1, description: "", imageUrl: "", status: "new" as "new" | "possible" | "rejected" | "approved", currency: "EUR", price: "" });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Refs for file inputs
  const placeFileInputRef = useRef<HTMLInputElement>(null);
  const activityFileInputRef = useRef<HTMLInputElement>(null);
  const accommodationFileInputRef = useRef<HTMLInputElement>(null);
  const transportFileInputRef = useRef<HTMLInputElement>(null);
  const tripCoverInputRef = useRef<HTMLInputElement>(null);

  // Load user and trips on mount
  useEffect(() => {
    const init = async () => {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        await loadTrips(currentUser.id);
        setView("dashboard");
      }
    };
    init();
  }, []);



  // Sync trips from storage and Supabase periodically (for collaboration)
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(async () => {
      const savedTrips = await getTripsForUser(user.id);
      // Try to sync from Supabase
      try {
        const supabaseTrips = await getTripsForUserFromSupabase(user.id);
        if (supabaseTrips !== null && supabaseTrips.length > 0) {
          // Merge Supabase trips with local trips
          const mergedTrips = [...savedTrips];
          supabaseTrips.forEach((st: Trip) => {
            const existingIndex = mergedTrips.findIndex(t => t.id === st.id);
            if (existingIndex >= 0) {
              // Use the most recent version
              if (new Date(st.updatedAt) > new Date(mergedTrips[existingIndex].updatedAt)) {
                mergedTrips[existingIndex] = st;
                saveTripToCache(st); // Update local storage (fire and forget)
              }
            } else {
              mergedTrips.push(st);
              saveTripToCache(st); // Update local storage (fire and forget)
            }
          });
          setTrips(mergedTrips);
          if (activeTrip) {
            const updated = mergedTrips.find(t => t.id === activeTrip.id);
            if (updated && new Date(updated.updatedAt) > new Date(activeTrip.updatedAt)) {
              setActiveTrip(updated);
            }
          }
        } else {
          // Supabase вернул null (не настроен) или пустой массив
          setTrips(savedTrips);
          if (activeTrip) {
            const updated = savedTrips.find(t => t.id === activeTrip.id);
            if (updated && new Date(updated.updatedAt) > new Date(activeTrip.updatedAt)) {
              setActiveTrip(updated);
            }
          }
        }
      } catch (error) {
        // Тихо игнорируем ошибки Supabase, продолжаем работу с localStorage
        setTrips(savedTrips);
        if (activeTrip) {
          const updated = savedTrips.find(t => t.id === activeTrip.id);
          if (updated && new Date(updated.updatedAt) > new Date(activeTrip.updatedAt)) {
            setActiveTrip(updated);
          }
        }
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [user, activeTrip]);

  // Fetch users for the active trip
  useEffect(() => {
    if (activeTrip) {
      const fetchUsers = async () => {
        const users = await Promise.all(activeTrip.users.map(id => getUserById(id)));
        setTripUsers(users.filter(Boolean) as User[]);
      };
      fetchUsers();
    } else {
      setTripUsers([]);
    }
  }, [activeTrip?.users]);

  const loadTrips = async (userId: string) => {
    const userTrips = await getTripsForUser(userId);
    setTrips(userTrips);
  };

  const handleRegister = async (email: string, name: string, password: string) => {
    const errors: Record<string, string> = {};
    if (!email.trim()) errors.email = translate("field_required");
    if (!name.trim()) errors.name = translate("field_required");
    if (!password.trim()) errors.password = translate("field_required");

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (await getUserByEmail(email)) {
      setFormErrors({ email: translate("user_exists") });
      return;
    }

    const newUser = await createUser(email, name, password);
    setCurrentUser(newUser);
    setUser(newUser);
    setView("dashboard");
    await loadTrips(newUser.id);
    // Clear form fields and errors
    setEmail("");
    setName("");
    setPassword("");
    setFormErrors({});
  };

  const handleLogin = async (email: string, password: string) => {
    const errors: Record<string, string> = {};
    if (!email.trim()) errors.email = translate("field_required");
    if (!password.trim()) errors.password = translate("field_required");

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const foundUser = await getUserByEmail(email);
    if (!foundUser || foundUser.password !== password) {
      setFormErrors({ auth: translate("invalid_credentials") });
      return;
    }

    setCurrentUser(foundUser);
    setUser(foundUser);
    
    // Check for pending share trip
    const pendingTrip = localStorage.getItem('pending_share_trip');
    if (pendingTrip) {
      try {
        const trip = JSON.parse(pendingTrip);
        if (!trip.users.includes(foundUser.id)) {
          trip.users.push(foundUser.id);
          saveTrip(trip);
        }
        setActiveTrip(trip);
        setView("plan");
        localStorage.removeItem('pending_share_trip');
      } catch (error) {
        console.error("Error processing pending trip:", error);
        setView("dashboard");
        loadTrips(foundUser.id);
      }
    } else {
      setView("dashboard");
      await loadTrips(foundUser.id);
    }
    
    // Clear form fields and errors
    setEmail("");
    setPassword("");
    setFormErrors({});
  };

  const handleLogout = () => {
    logoutUser();
    setUser(null);
    setTrips([]);
    setActiveTrip(null);
    setView("login");
    // Clear form fields
    setEmail("");
    setName("");
    setPassword("");
  };

  const createTrip = () => {
    if (!user) return;

    const trip: Trip = {
      id: Date.now(),
      name: language === "ru" ? "Новая поездка" : "New Trip",
      users: [user.id],
      progress: 0,
      chat: [],
      createdBy: user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      images: [],
      votingOptions: [],
      expenses: [],
      places: [],
      activities: [],
      accommodations: [],
      transports: [],
      currency: "EUR",
    };
    
    const tripWithProgress = { ...trip, progress: calculateProgress(trip) };
    saveTrip(tripWithProgress);
    setTrips([...trips, tripWithProgress]);
    setActiveTrip(tripWithProgress);
    setView("plan");
  };

  // Logic for trip progress
  const calculateProgress = (trip: Trip): number => {
    let progress = 0;
    
    // Check if any items exist in each category (20% each)
    const hasPlace = (trip.places || []).length > 0;
    const hasActivity = (trip.activities || []).length > 0;
    const hasAccommodation = (trip.accommodations || []).length > 0;
    const hasTransport = (trip.transports || []).length > 0;
    const hasExpense = (trip.expenses || []).length > 0;

    if (hasPlace) progress += 20;
    if (hasActivity) progress += 20;
    if (hasAccommodation) progress += 20;
    if (hasTransport) progress += 20;
    if (hasExpense) progress += 20;

    return progress;
  };

  // Check if trip is in the past
  const isTripPast = (trip: Trip): boolean => {
    if (!trip.endDate) return false;
    const endDate = new Date(trip.endDate);
    const now = new Date();
    return endDate < now;
  };

  // Update trip name
  const updateTripName = () => {
    if (!activeTrip || !editingItem) return;
    
    if (!editingItem.name?.trim()) {
      setFormErrors({ name: translate("field_required") });
      return;
    }

    const updated: Trip = {
      ...activeTrip,
      name: editingItem.name.trim(),
      updatedAt: new Date(),
    };
    setActiveTrip(updated);
    saveTrip(updated);
    setEditTripNameDialogOpen(false);
    setEditingItem(null);
    setFormErrors({});
  };

  // Update place
  const updatePlace = () => {
    if (!activeTrip || !editingItem) return;
    
    const errors: Record<string, string> = {};
    if (!newPlace.name.trim()) errors.name = translate("field_required");
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const updated: Trip = {
      ...activeTrip,
      places: (activeTrip.places || []).map(p => 
        p.id === editingItem.id ? { ...p, ...newPlace, price: parseFloat(newPlace.price) || 0 } : p
      ),
      updatedAt: new Date(),
    };
    const withProgress = { ...updated, progress: calculateProgress(updated) };
    setActiveTrip(withProgress);
    saveTrip(withProgress);
    setEditPlaceDialogOpen(false);
    setEditingItem(null);
    setNewPlace({ name: "", address: "", imageUrl: "", googleMapsLink: "", status: "new", currency: "EUR", price: "" });
    setFormErrors({});
  };

  // Update activity
  const updateActivity = () => {
    if (!activeTrip || !editingItem) return;

    const errors: Record<string, string> = {};
    if (!newActivity.name.trim()) errors.name = translate("field_required");
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const updated: Trip = {
      ...activeTrip,
      activities: ((activeTrip.activities as unknown as Activity[]) || []).map(a => 
        a.id === editingItem.id ? { ...a, ...newActivity, approved: newActivity.status === "approved", price: parseFloat(newActivity.price) || 0 } : a
      ),
      updatedAt: new Date(),
    };
    const withProgress = { ...updated, progress: calculateProgress(updated) };
    setActiveTrip(withProgress);
    saveTrip(withProgress);
    setEditActivityDialogOpen(false);
    setEditingItem(null);
    setNewActivity({ name: "", description: "", imageUrl: "", link: "", address: "", day: 1, time: "", status: "new", currency: "EUR", price: "" });
    setFormErrors({});
  };

  // Update accommodation
  const updateAccommodation = () => {
    if (!activeTrip || !editingItem) return;

    const errors: Record<string, string> = {};
    if (!newAccommodation.name.trim()) errors.name = translate("field_required");
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const updated: Trip = {
      ...activeTrip,
      accommodations: (activeTrip.accommodations || []).map(acc => 
        acc.id === editingItem.id ? { ...acc, ...newAccommodation, price: parseFloat(newAccommodation.price) || 0 } : acc
      ),
      updatedAt: new Date(),
    };
    const withProgress = { ...updated, progress: calculateProgress(updated) };
    setActiveTrip(withProgress);
    saveTrip(withProgress);
    setEditAccommodationDialogOpen(false);
    setEditingItem(null);
    setNewAccommodation({ name: "", address: "", imageUrl: "", bookingLink: "", description: "", checkIn: "", checkOut: "", price: "", status: "new", currency: "EUR", guests: 1 });
    setFormErrors({});
  };

  // Update transport
  const updateTransport = () => {
    if (!activeTrip || !editingItem) return;

    const errors: Record<string, string> = {};
    if (!newTransport.from.trim()) errors.from = translate("field_required");
    if (!newTransport.to.trim()) errors.to = translate("field_required");
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const updated: Trip = {
      ...activeTrip,
      transports: (activeTrip.transports || []).map(tr => 
        tr.id === editingItem.id ? { ...tr, ...newTransport, price: parseFloat(newTransport.price) || 0 } : tr
      ),
      updatedAt: new Date(),
    };
    const withProgress = { ...updated, progress: calculateProgress(updated) };
    setActiveTrip(withProgress);
    saveTrip(withProgress);
    setEditTransportDialogOpen(false);
    setEditingItem(null);
    setNewTransport({ type: "plane", from: "", to: "", departureTime: "", departurePlace: "", arrivalTime: "", arrivalPlace: "", passengers: 1, description: "", imageUrl: "", status: "new", currency: "EUR", price: "" });
    setFormErrors({});
  };

  // Update expense
  const updateExpense = () => {
    if (!activeTrip || !editingItem) return;

    const errors: Record<string, string> = {};
    if (!newExpense.description.trim()) errors.description = translate("field_required");
    if (!newExpense.amount) {
      errors.amount = translate("field_required");
    } else {
      const amount = parseFloat(newExpense.amount);
      if (isNaN(amount) || amount <= 0) {
        errors.amount = translate("enter_valid_amount");
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const amount = parseFloat(newExpense.amount);
    const sharedBy = newExpense.sharedBy.length > 0 ? newExpense.sharedBy : activeTrip.users;
    const currency = newExpense.currency || activeTrip.currency || "RUB";
    
    const updated: Trip = {
      ...activeTrip,
      expenses: (activeTrip.expenses || []).map(exp => 
        exp.id === editingItem.id ? {
          ...exp,
          description: newExpense.description,
          amount,
          category: newExpense.category,
          sharedBy,
          currency,
        } : exp
      ),
      updatedAt: new Date(),
    };
    setActiveTrip(updated);
    saveTrip(updated);
    setEditExpenseDialogOpen(false);
    setEditingItem(null);
    setNewExpense({ description: "", amount: "", category: "", sharedBy: [], currency: activeTrip.currency || "RUB" });
    setFormErrors({});
  };

  // Update status for any card
  const updateCardStatus = (type: "place" | "activity" | "accommodation" | "transport", id: string, status: "new" | "possible" | "rejected" | "approved") => {
    if (!activeTrip) return;
    let updated: Trip = { ...activeTrip, updatedAt: new Date() };
    
    if (type === "place") {
      updated.places = (activeTrip.places || []).map(p => p.id === id ? { ...p, status } : p);
    } else if (type === "activity") {
      updated.activities = ((activeTrip.activities as unknown as Activity[]) || []).map(a => a.id === id ? { ...a, status, approved: status === "approved" } : a);
    } else if (type === "accommodation") {
      updated.accommodations = (activeTrip.accommodations || []).map(acc => acc.id === id ? { ...acc, status } : acc);
    } else if (type === "transport") {
      updated.transports = (activeTrip.transports || []).map(tr => tr.id === id ? { ...tr, status } : tr);
    }
    
    const withProgress = { ...updated, progress: calculateProgress(updated) };
    setActiveTrip(withProgress);
    saveTrip(withProgress);
  };

  // Handle trip cover image upload
  const handleTripCoverImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeTrip || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    
    if (file.size > 5 * 1024 * 1024) {
      alert(translate("file_too_large"));
      return;
    }
    
    const reader = new FileReader();
    reader.onerror = () => {
      alert(translate("error_loading_image"));
    };
    reader.onloadend = () => {
      const updated: Trip = {
        ...activeTrip,
        coverImage: reader.result as string,
        updatedAt: new Date(),
      };
      setActiveTrip(updated);
      saveTrip(updated);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };


  const sendMessage = () => {
    if (!messageInput.trim() || !activeTrip || !user) return;

    const updated: Trip = {
      ...activeTrip,
      chat: [
        ...activeTrip.chat,
        {
          user: user.name,
          text: messageInput.trim(),
          time: new Date(),
        },
      ],
      updatedAt: new Date(),
    };

    setActiveTrip(updated);
    saveTrip(updated);
    setMessageInput("");
  };

  const inviteUserToTrip = async () => {
    if (!inviteEmail.trim() || !activeTrip || !user) {
      if (!inviteEmail.trim()) setFormErrors({ invite: translate("field_required") });
      return;
    }

    const invitedUser = await getUserByEmail(inviteEmail);
    if (!invitedUser) {
      setFormErrors({ invite: translate("user_email_not_found") });
      return;
    }

    if (activeTrip.users.includes(invitedUser.id)) {
      setFormErrors({ invite: translate("user_already_added") });
      return;
    }

    const updated: Trip = {
      ...activeTrip,
      users: [...(activeTrip.users || []), invitedUser.id],
      updatedAt: new Date(),
    };

    setActiveTrip(updated);
    await saveTrip(updated);
    setInviteEmail("");
    setFormErrors({});
    setInviteDialogOpen(false);
    alert(`${invitedUser.name} ${translate("user_invited_success")}`);
  };

  const removeUserFromTrip = (userId: string) => {
    if (!activeTrip || !user) return;
    if (activeTrip.createdBy === userId && user.id !== userId) {
      alert(translate("cannot_delete_creator"));
      return;
    }

    if (!window.confirm(translate("confirm_delete_participant"))) {
      return;
    }

    const updated: Trip = {
      ...activeTrip,
      users: activeTrip.users.filter(id => id !== userId),
      updatedAt: new Date(),
    };

    setActiveTrip(updated);
    saveTrip(updated);
  };

  if (view === "login" || view === "register") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="w-full max-w-md shadow-2xl border-0">
            <CardContent className="p-8 space-y-6">
              <div className="text-center space-y-2">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="text-5xl mb-4"
                >
                  ✈️
                </motion.div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {translate("trip_planner")}
                </h1>
                <p className="text-gray-500">
                  {view === "login" ? translate("login_to_account") : translate("create_new_account")}
                </p>
              </div>
                  <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" required>{translate("email") || "Email"}</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      error={!!formErrors.email}
                      className="h-12 text-lg"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && view === "login") {
                          handleLogin(email, password);
                        }
                      }}
                      autoFocus
                    />
                    {formErrors.email && <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>}
                  </div>
                  {view === "register" && (
                    <div className="space-y-2">
                      <Label htmlFor="name" required>{translate("name")}</Label>
                      <Input
                        id="name"
                        placeholder={translate("name")}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        error={!!formErrors.name}
                        className="h-12 text-lg"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleRegister(email, name, password);
                          }
                        }}
                      />
                      {formErrors.name && <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="password" required>{translate("password")}</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder={translate("password")}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      error={!!formErrors.password}
                      className="h-12 text-lg"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          if (view === "login") {
                            handleLogin(email, password);
                          } else {
                            handleRegister(email, name, password);
                          }
                        }
                      }}
                    />
                    {formErrors.password && <p className="text-red-500 text-sm mt-1">{formErrors.password}</p>}
                  </div>
                  {formErrors.auth && <p className="text-red-500 text-sm text-center font-semibold">{formErrors.auth}</p>}
                <Button
                  onClick={() => {
                    if (view === "login") {
                      handleLogin(email, password);
                    } else {
                      handleRegister(email, name, password);
                    }
                  }}
                  className="w-full h-12 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {view === "login" ? translate("enter") : translate("register")}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setView(view === "login" ? "register" : "login");
                    // Clear form when switching
                    setEmail("");
                    setName("");
                    setPassword("");
                    setFormErrors({});
                  }}
                  className="w-full"
                >
                  {view === "login"
                    ? translate("no_account") + " " + translate("register")
                    : translate("already_have_account") + " " + translate("enter")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (view === "dashboard") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6 pt-20">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-7xl mx-auto"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {translate("my_trips")}, {user?.name}! 👋
              </h1>
              <p className="text-gray-600 mt-2">{translate("my_trips")}</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="px-3 py-2 border rounded-md text-sm bg-white"
              >
                <option value="ru">🇷🇺 {translate("russian")}</option>
                <option value="en">🇬🇧 {translate("english")}</option>
              </select>
              <Button variant="outline" onClick={handleLogout}>
                {translate("logout")}
              </Button>
            </div>
          </div>

          {trips.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16"
            >
              <div className="text-6xl mb-4">🗺️</div>
              <h2 className="text-2xl font-semibold text-gray-700 mb-2">
                У вас пока нет поездок
              </h2>
              <p className="text-gray-500 mb-6">
                Создайте первую поездку, чтобы начать планирование
              </p>
              <Button
                onClick={createTrip}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8 py-6"
                size="lg"
              >
                + {translate("create_first_trip")}
              </Button>
            </motion.div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {trips.map((trip, index) => (
                  <motion.div
                    key={trip.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.03, y: -5 }}
                    className="cursor-pointer"
                  >
                    <Card
                      onClick={() => {
                        setActiveTrip(trip);
                        setView("plan");
                      }}
                      className="h-full shadow-lg hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm relative overflow-hidden"
                    >
                      <CardContent className="p-6 space-y-4 relative z-10">
                        <div className="flex items-start justify-between">
                          <h2 className="text-xl font-bold text-gray-800">{trip.name}</h2>
                          <span className="text-2xl">✈️</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">{translate("general_progress")}</span>
                            <span className="font-semibold text-blue-600">{trip.progress}%</span>
                          </div>
                          <Progress value={trip.progress} className="h-2" />
                        </div>
                        {trip.place && (
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            📍 {trip.place}
                          </p>
                        )}
                        <div className="pt-2 border-t">
                          <p className="text-xs text-gray-400">
                            {translate("participants_count")}: {trip.users.length}
                          </p>
                          {trip.createdBy === user?.id && (
                            <p className="text-xs text-blue-500 mt-1">{translate("creator")}</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                className="cursor-pointer"
              >
                <Card
                  onClick={createTrip}
                  className="h-full border-2 border-dashed border-gray-300 hover:border-blue-500 transition-colors bg-white/50 backdrop-blur-sm flex items-center justify-center"
                >
                  <CardContent className="p-6 w-full text-center">
                    <div className="text-4xl mb-3">➕</div>
                    <p className="text-gray-600 font-medium">{translate("create_trip")}</p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  // Expense handling
  const addExpense = () => {
    if (!activeTrip || !user) return;
    
    const errors: Record<string, string> = {};
    if (!newExpense.description.trim()) errors.description = translate("field_required");
    if (!newExpense.amount) {
      errors.amount = translate("field_required");
    } else {
      const amount = parseFloat(newExpense.amount);
      if (isNaN(amount) || amount <= 0) {
        errors.amount = translate("enter_valid_amount");
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const amount = parseFloat(newExpense.amount);
    const sharedBy = newExpense.sharedBy.length > 0 ? newExpense.sharedBy : activeTrip.users;
    const currency = newExpense.currency || activeTrip.currency || "RUB";
    
    const expense: Expense = {
      id: Date.now().toString(),
      description: newExpense.description,
      amount,
      category: newExpense.category || (language === "ru" ? "Другое" : "Other"),
      paidBy: user.id,
      sharedBy,
      currency,
      createdAt: new Date(),
    };
    
    const updated: Trip = {
      ...activeTrip,
      expenses: [...(activeTrip.expenses || []), expense],
      updatedAt: new Date(),
    };
    
    const withProgress = { ...updated, progress: calculateProgress(updated) };
    setActiveTrip(withProgress);
    saveTrip(withProgress);
    setNewExpense({ description: "", amount: "", category: "", sharedBy: [], currency: activeTrip.currency || "RUB" });
    setFormErrors({});
    setExpenseDialogOpen(false);
  };

  const getTotalExpenses = () => {
    if (!activeTrip) return 0;
    return (activeTrip.expenses || []).reduce((sum, exp) => sum + exp.amount, 0);
  };

  const getUserExpenses = (userId: string) => {
    if (!activeTrip) return 0;
    return (activeTrip.expenses || [])
      .filter(exp => exp.sharedBy.includes(userId))
      .reduce((sum, exp) => sum + (exp.amount / exp.sharedBy.length), 0);
  };

  // Place management
  const addPlace = () => {
    if (!activeTrip || !user) return;
    
    const errors: Record<string, string> = {};
    if (!newPlace.name.trim()) errors.name = translate("field_required");
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    const maxOrder = Math.max(0, ...(activeTrip.places || []).map(p => p.order));
    const place = {
      id: Date.now().toString(),
      name: newPlace.name,
      address: newPlace.address,
      imageUrl: newPlace.imageUrl,
      coordinates: null, // Убрали ввод координат
      googleMapsLink: newPlace.googleMapsLink || "",
      order: maxOrder + 1,
      status: newPlace.status || "pending",
      price: parseFloat(newPlace.price) || 0,
      currency: newPlace.currency || "EUR",
      createdAt: new Date(),
    };
    
    const updated: Trip = {
      ...activeTrip,
      places: [...(activeTrip.places || []), place],
      updatedAt: new Date(),
    };
    
    const withProgress = { ...updated, progress: calculateProgress(updated) };
    setActiveTrip(withProgress);
    saveTrip(withProgress);
    setNewPlace({ name: "", address: "", imageUrl: "", googleMapsLink: "", status: "new", currency: "EUR", price: "" });
    setFormErrors({});
    setPlaceDialogOpen(false);
  };

  const handlePlaceImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Проверка размера файла (макс 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert(translate("file_too_large"));
      return;
    }
    
    const reader = new FileReader();
    reader.onerror = () => {
      alert(translate("error_loading_image"));
    };
    reader.onloadend = () => {
      if (reader.result && typeof reader.result === 'string') {
        setNewPlace(prev => ({ ...prev, imageUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
    // Сброс input для возможности повторной загрузки того же файла
    e.target.value = '';
  };

  // Activity management
  const addActivity = () => {
    if (!activeTrip || !user) return;
    
    const errors: Record<string, string> = {};
    if (!newActivity.name.trim()) errors.name = translate("field_required");
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    const activity: Activity = {
      id: Date.now().toString(),
      name: newActivity.name,
      description: newActivity.description,
      imageUrl: newActivity.imageUrl,
      link: newActivity.link,
      address: newActivity.address,
      votes: [],
      createdBy: user.id,
      approved: false,
      day: newActivity.day || 1,
      time: newActivity.time,
      status: newActivity.status || "new",
      currency: newActivity.currency || "EUR",
      price: parseFloat(newActivity.price) || 0,
      createdAt: new Date(),
    };
    
    const updated: Trip = {
      ...activeTrip,
      activities: [...((activeTrip.activities as unknown as Activity[]) || []), activity],
      updatedAt: new Date(),
    };
    
    const withProgress = { ...updated, progress: calculateProgress(updated) };
    setActiveTrip(withProgress);
    saveTrip(withProgress);
    setNewActivity({ name: "", description: "", imageUrl: "", link: "", address: "", day: 1, time: "", status: "new", currency: "EUR", price: "" });
    setFormErrors({});
    setActivityDialogOpen(false);
  };

  const handleActivityImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    if (file.size > 5 * 1024 * 1024) {
      alert(translate("file_too_large"));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => {
      alert(translate("error_loading_image"));
    };
    reader.onloadend = () => {
      if (reader.result) {
        setNewActivity({ ...newActivity, imageUrl: reader.result as string });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Accommodation management
  const addAccommodation = () => {
    if (!activeTrip || !user) return;
    
    const errors: Record<string, string> = {};
    if (!newAccommodation.name.trim()) errors.name = translate("field_required");
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    const accommodation: Accommodation = {
      id: Date.now().toString(),
      name: newAccommodation.name,
      address: newAccommodation.address,
      imageUrl: newAccommodation.imageUrl,
      bookingLink: newAccommodation.bookingLink,
      description: newAccommodation.description,
      checkIn: newAccommodation.checkIn,
      checkOut: newAccommodation.checkOut,
      price: parseFloat(newAccommodation.price) || 0,
      status: newAccommodation.status || "new",
      guests: newAccommodation.guests,
      votes: [],
      createdAt: new Date(),
    };
    
    const updated: Trip = {
      ...activeTrip,
      accommodations: [...(activeTrip.accommodations || []), accommodation],
      updatedAt: new Date(),
    };
    
    const withProgress = { ...updated, progress: calculateProgress(updated) };
    setActiveTrip(withProgress);
    saveTrip(withProgress);
    setNewAccommodation({ name: "", address: "", imageUrl: "", bookingLink: "", description: "", checkIn: "", checkOut: "", price: "", status: "new", currency: "EUR", guests: 1 });
    setFormErrors({});
    setAccommodationDialogOpen(false);
  };

  const handleAccommodationImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      alert(translate("file_too_large"));
      return;
    }
    
    const reader = new FileReader();
    reader.onerror = () => {
      alert(translate("error_loading_image"));
    };
    reader.onloadend = () => {
      if (reader.result && typeof reader.result === 'string') {
        setNewAccommodation(prev => ({ ...prev, imageUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Transport management
  const addTransport = () => {
    if (!activeTrip || !user) return;
    
    const errors: Record<string, string> = {};
    if (!newTransport.from.trim()) errors.from = translate("field_required");
    if (!newTransport.to.trim()) errors.to = translate("field_required");
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    const transport: Transport = {
      id: Date.now().toString(),
      type: newTransport.type,
      from: newTransport.from,
      to: newTransport.to,
      departureTime: newTransport.departureTime,
      departurePlace: newTransport.departurePlace,
      arrivalTime: newTransport.arrivalTime,
      arrivalPlace: newTransport.arrivalPlace,
      passengers: newTransport.passengers,
      description: newTransport.description,
      imageUrl: newTransport.imageUrl,
      status: newTransport.status || "new",
      price: parseFloat(newTransport.price) || 0,
      currency: newTransport.currency || "EUR",
      createdAt: new Date(),
    };
    
    const updated: Trip = {
      ...activeTrip,
      transports: [...(activeTrip.transports || []), transport],
      updatedAt: new Date(),
    };
    
    const withProgress = { ...updated, progress: calculateProgress(updated) };
    setActiveTrip(withProgress);
    saveTrip(withProgress);
    setNewTransport({ type: "plane", from: "", to: "", departureTime: "", departurePlace: "", arrivalTime: "", arrivalPlace: "", passengers: 1, description: "", imageUrl: "", status: "new", currency: "EUR", price: "" });
    setFormErrors({});
    setTransportDialogOpen(false);
  };

  const handleTransportImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      alert(translate("file_too_large"));
      return;
    }
    
    const reader = new FileReader();
    reader.onerror = () => {
      alert(translate("error_loading_image"));
    };
    reader.onloadend = () => {
      if (reader.result && typeof reader.result === 'string') {
        setNewTransport(prev => ({ ...prev, imageUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  if (view === "plan" && activeTrip && user) {
    // tripUsers is already fetched in useEffect

    return (
      <div 
        className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6 pt-20 relative overflow-x-hidden"
        style={activeTrip.coverImage ? {
          backgroundImage: `url(${activeTrip.coverImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        } : {}}
      >
        {activeTrip.coverImage && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm pointer-events-none" />
        )}
        <div className="max-w-4xl mx-auto space-y-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => setView("dashboard")}
                className="text-lg"
              >
                ← {translate("back")}
              </Button>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mt-0">
                {activeTrip && isTripPast(activeTrip) 
                  ? translate("trip_information")
                  : translate("trip_planning")
                }
              </h1>
            </div>

          </motion.div>

          {/* Trip Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card 
              className="shadow-2xl border-0 bg-white/80 backdrop-blur-md relative overflow-hidden"
            >
              <CardContent className="p-6 relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        {activeTrip.name}
                      </h2>
                      <Button
                        onClick={() => {
                          setEditingItem({ name: activeTrip.name });
                          setEditTripNameDialogOpen(true);
                        }}
                        variant="ghost"
                        size="sm"
                        className="text-gray-500 hover:text-gray-700"
                      >
                        ✏️
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500">
                      {translate("updated")}: {new Date(activeTrip.updatedAt).toLocaleString(language === "ru" ? "ru-RU" : "en-US")}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {/* Trip cover image upload */}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={tripCoverInputRef}
                      onChange={handleTripCoverImageUpload}
                    />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => tripCoverInputRef.current?.click()}
                    >
                      📷 {translate("cover")}
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={async () => {
                      try {
                        const { generateShareToken } = await import("@/utils/supabase");
                        const token = await generateShareToken(activeTrip.id);
                        if (token) {
                          const shareUrl = `${window.location.origin}/share/${token}`;
                          setShareLink(shareUrl);
                          setShareDialogOpen(true);
                        } else {
                          alert(translate("link_copied"));
                        }
                      } catch (error) {
                        // Fallback: generate local token
                        const localToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                        const shareUrl = `${window.location.origin}/share/${localToken}`;
                        setShareLink(shareUrl);
                        setShareDialogOpen(true);
                      }
                    }}
                    variant="outline"
                    className="border-blue-300 text-blue-600 hover:bg-blue-50"
                  >
                    🔗 {translate("share")}
                  </Button>
                  <Button
                    onClick={() => setInviteDialogOpen(true)}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    + {translate("invite")}
                  </Button>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                    👥 {translate("participants")}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {tripUsers.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full text-sm shadow-sm"
                      >
                        <span className="font-medium text-blue-700">{u.name}</span>
                        {u.id === activeTrip.createdBy && (
                          <span className="text-xs">👑</span>
                        )}
                        {activeTrip.users.includes(user.id) &&
                          (activeTrip.createdBy === user.id || user.id === u.id) &&
                          u.id !== activeTrip.createdBy && (
                            <button
                              onClick={() => removeUserFromTrip(u.id)}
                              className="text-red-500 hover:text-red-700 ml-1"
                            >
                              ×
                            </button>
                          )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Progress and Actions Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {/* Progress Section */}
            <Card className="md:col-span-2 shadow-xl border-0 bg-gradient-to-br from-white via-blue-50/50 to-purple-50/50 backdrop-blur-sm">
              <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">{translate("general_progress")}</span>
                  <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{activeTrip.progress}%</span>
                </div>
                <Progress value={activeTrip.progress} className="h-4" />
              </CardContent>
            </Card>

            {/* Actions Buttons */}
            <div className="flex gap-4">
              <Button
                onClick={() => setView("chat")}
                variant="outline"
                className="flex-1 h-full text-lg shadow-md hover:shadow-lg transition-all"
              >
                💬 {translate("chat")}
              </Button>
              <Button
                onClick={() => setView("summary")}
                className="flex-1 h-full text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all"
              >
                📋 {translate("summary")}
              </Button>
            </div>
          </motion.div>

          {/* Places Section - Separate Block */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="shadow-2xl border-0 bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 backdrop-blur-sm hover:shadow-3xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
                    📍 {translate("places")}
                  </h2>
                  <Button
                    onClick={() => setPlaceDialogOpen(true)}
                    variant="outline"
                    size="sm"
                    className="border-blue-300 text-blue-600 hover:bg-blue-50"
                  >
                    + {translate("add_place")}
                  </Button>
                </div>
                <div className="space-y-3">
                  {[...(activeTrip.places || [])].sort((a, b) => a.order - b.order).map((place) => (
                    <div 
                      key={place.id} 
                      className={`p-4 rounded-xl bg-white/80 hover:border-blue-300 transition-all shadow-sm ${
                        place.status === "approved" 
                          ? "border-4 border-green-500" 
                          : place.status === "rejected"
                          ? "border-4 border-red-500"
                          : place.status === "possible"
                          ? "border-4 border-yellow-500"
                          : "border-2 border-blue-100"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="font-semibold text-lg text-gray-800">{place.name}</div>
                            {renderStatusBadge(place.status || "new")}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">{place.address}</div>
                          {place.googleMapsLink && (
                            <a
                              href={place.googleMapsLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 text-sm hover:underline mt-1 inline-block font-medium"
                            >
                              🗺️ {translate("open_google_maps")}
                            </a>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="text-sm font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded-full">#{place.order}</div>
                        </div>
                      </div>
                      {place.imageUrl && (
                        <img
                          src={place.imageUrl}
                          alt={place.name}
                          className="w-full h-48 object-cover rounded-lg mt-2 shadow-md"
                        />
                      )}
                      <div className="flex gap-2 mt-3">
                        <Button
                          onClick={() => {
                            setEditingItem(place);
                            setNewPlace({
                              name: place.name,
                              address: place.address,
                              imageUrl: place.imageUrl,
                              googleMapsLink: place.googleMapsLink,
                              status: (place.status || "new") as "new" | "possible" | "rejected" | "approved",
                                currency: place.currency || "EUR",
                                price: place.price?.toString() || "",
                              });
                              setEditPlaceDialogOpen(true);
                              setFormErrors({});
                            }}
                          variant="outline"
                          size="sm"
                          className="border-blue-300 text-blue-600 hover:bg-blue-50"
                        >
                          ✏️ {translate("edit")}
                        </Button>
                        <Button
                          onClick={() => {
                            if (window.confirm(translate("confirm_delete_place"))) {
                              const updated = {
                                ...activeTrip,
                                places: (activeTrip.places || []).filter(p => p.id !== place.id),
                                updatedAt: new Date(),
                              };
                              const withProgress = { ...updated, progress: calculateProgress(updated) };
                              setActiveTrip(withProgress);
                              saveTrip(withProgress);
                            }
                          }}
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          {translate("delete")}
                        </Button>
                        {place.order > 1 && (
                          <Button
                            onClick={async () => {
                              const updated = {
                                ...activeTrip,
                                places: (activeTrip.places || []).map(p =>
                                  p.id === place.id ? { ...p, order: p.order - 1 } :
                                  p.order === place.order - 1 ? { ...p, order: p.order + 1 } : p
                                ),
                                updatedAt: new Date(),
                              };
                              setActiveTrip(updated);
                              await saveTrip(updated);
                            }}
                            variant="outline"
                            size="sm"
                            className="border-blue-300 text-blue-600 hover:bg-blue-50"
                          >
                            ↑ {translate("up")}
                          </Button>
                        )}
                        {place.order < (activeTrip.places || []).length && (
                          <Button
                            onClick={() => {
                              const updated = {
                                ...activeTrip,
                                places: (activeTrip.places || []).map(p =>
                                  p.id === place.id ? { ...p, order: p.order + 1 } :
                                  p.order === place.order + 1 ? { ...p, order: p.order - 1 } : p
                                ),
                                updatedAt: new Date(),
                              };
                              setActiveTrip(updated);
                              saveTrip(updated);
                            }}
                            variant="outline"
                            size="sm"
                            className="border-blue-300 text-blue-600 hover:bg-blue-50"
                          >
                            ↓ {translate("down")}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {(activeTrip.places || []).length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      <div className="text-4xl mb-2">📍</div>
                      <p className="text-sm">{translate("no_places")}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Budget Section - Separate Block */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="shadow-2xl border-0 bg-gradient-to-br from-white via-green-50/30 to-emerald-50/30 backdrop-blur-sm hover:shadow-3xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent flex items-center gap-2">
                    💰 {translate("budget_expenses")}
                  </h2>
                  <Button
                    onClick={() => {
                      setFormErrors({});
                      setExpenseDialogOpen(true);
                    }}
                    variant="outline"
                    size="sm"
                    className="border-green-300 text-green-600 hover:bg-green-50"
                  >
                    + {translate("add_expense")}
                  </Button>
                </div>
                
                {/* Expenses by Category */}
                <div className="space-y-4 mb-4">
                  {Object.entries(
                    (activeTrip.expenses || []).reduce((acc, exp) => {
                      const cat = exp.category || "Другое";
                      if (!acc[cat]) acc[cat] = [];
                      acc[cat].push(exp);
                      return acc;
                    }, {} as Record<string, typeof activeTrip.expenses>)
                  ).map(([category, expenses]) => (
                    <div key={category} className="p-4 border-2 border-green-100 rounded-xl bg-white/80 shadow-sm">
                      <h3 className="font-semibold mb-3 text-green-700">{category}</h3>
                      <div className="space-y-2">
                        {expenses.map((exp) => {
                          const paidByUser = tripUsers.find(u => u.id === exp.paidBy);
                          const perPerson = exp.amount / exp.sharedBy.length;
                          return (
                            <div key={exp.id} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded gap-2">
                              <span className="text-gray-700 flex-1">{exp.description} - {paidByUser?.name}</span>
                              <span className="font-medium text-green-700">{exp.amount.toFixed(2)} {exp.currency || "₽"} <span className="text-gray-500">({perPerson.toFixed(2)} {exp.currency || "₽"}/чел)</span></span>
                              <Button
                                onClick={() => {
                                  setEditingItem(exp);
                                  setNewExpense({
                                    description: exp.description,
                                    amount: exp.amount.toString(),
                                    category: exp.category,
                                    sharedBy: exp.sharedBy,
                                    currency: exp.currency || activeTrip?.currency || "RUB",
                                  });
                                  setEditExpenseDialogOpen(true);
                                  setFormErrors({});
                                }}
                                variant="ghost"
                                size="sm"
                                className="text-blue-600 hover:bg-blue-50"
                              >
                                ✏️
                              </Button>
                              <Button
                                onClick={() => {
                                  const updated = {
                                    ...activeTrip,
                                    expenses: (activeTrip.expenses || []).filter(e => e.id !== exp.id),
                                    updatedAt: new Date(),
                                  };
                                  setActiveTrip(updated);
                                  saveTrip(updated);
                                }}
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:bg-red-50"
                              >
                                ×
                              </Button>
                            </div>
                          );
                        })}
                          <div className="pt-2 border-t border-green-200 font-semibold text-green-700">
                           {translate("total_category")}: {expenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2)} {activeTrip.currency || "RUB"}
                          </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Debts */}
                <div className="pt-4 border-t border-green-200">
                  <h3 className="font-semibold mb-3 text-gray-700">{translate("debts")}:</h3>
                  <div className="space-y-2">
                    {tripUsers.map((u) => {
                      const userExpenses = getUserExpenses(u.id);
                      const userPaid = (activeTrip.expenses || [])
                        .filter(exp => exp.paidBy === u.id)
                        .reduce((sum, exp) => sum + exp.amount, 0);
                      const debt = userExpenses - userPaid;
                      return (
                        <div key={u.id} className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                          <span className="font-medium text-gray-700">{u.name}</span>
                          <span className={`font-semibold ${debt > 0 ? "text-red-600" : debt < 0 ? "text-green-600" : "text-gray-600"}`}>
                            {debt > 0 ? `${translate("owes")}: ${debt.toFixed(2)} ${activeTrip.currency || "RUB"}` : debt < 0 ? `${translate("owed")}: ${Math.abs(debt).toFixed(2)} ${activeTrip.currency || "RUB"}` : translate("balance")}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 pt-4 border-t border-green-200 font-bold text-lg text-green-700 bg-green-50 p-3 rounded-lg">
                    {translate("total_spent")}: {getTotalExpenses().toFixed(2)} {activeTrip.currency || "RUB"}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Activities Section - Separate Block */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card className="shadow-2xl border-0 bg-gradient-to-br from-white via-orange-50/30 to-amber-50/30 backdrop-blur-sm hover:shadow-3xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent flex items-center gap-2">
                    🎯 {translate("activities")}
                  </h2>
                  <Button
                    onClick={() => {
                      setFormErrors({});
                      setActivityDialogOpen(true);
                    }}
                    variant="outline"
                    size="sm"
                    className="border-orange-300 text-orange-600 hover:bg-orange-50"
                  >
                    + {translate("add_activity")}
                  </Button>
                </div>
                <div className="space-y-3">
                  {[...((activeTrip.activities as unknown as Activity[]) || [])]
                    .filter((a: Activity) => a.approved)
                    .sort((a, b) => {
                      if (a.day !== b.day) return a.day - b.day;
                      return a.time.localeCompare(b.time);
                    })
                    .map((activity) => (
                      <div key={activity.id} className="p-4 border-2 border-green-300 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 shadow-md">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="font-semibold text-lg flex items-center gap-2 text-gray-800">
                              {activity.name}
                              {renderStatusBadge(activity.status || "approved")}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">{activity.description}</div>
                            <div className="text-sm text-gray-500 mt-1">📍 {activity.address}</div>
                            {activity.link && (
                              <a
                                href={activity.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 text-sm hover:underline mt-1 inline-block font-medium"
                              >
                                🔗 {translate("link")}
                              </a>
                            )}
                            {((activity.price || 0) > 0) && (
                              <div className="text-sm font-semibold text-green-600 mt-2">
                                {translate("price")}: {(activity.price || 0).toFixed(2)} {activity.currency || "EUR"}
                              </div>
                            )}
                            <div className="text-sm font-medium mt-2 bg-white px-3 py-1 rounded-full inline-block text-orange-700">
                              📅 {translate("day_param").replace("{day}", activity.day.toString()).replace("{time}", activity.time)}
                            </div>
                          </div>
                        </div>
                        {activity.imageUrl && (
                          <img
                            src={activity.imageUrl}
                            alt={activity.name}
                            className="w-full h-48 object-cover rounded-lg mt-2 shadow-md"
                          />
                        )}
                        <div className="flex gap-2 mt-3">
                        <Button
                            onClick={() => {
                              setEditingItem(activity);
                              setNewActivity({
                                name: activity.name,
                                description: activity.description,
                                imageUrl: activity.imageUrl,
                                link: activity.link,
                                address: activity.address,
                                day: activity.day,
                                time: activity.time,
                                status: (activity.status || "approved") as any,
                                currency: activity.currency || "EUR",
                                price: activity.price?.toString() || "",
                              });
                              setEditActivityDialogOpen(true);
                              setFormErrors({});
                            }}
                            variant="outline"
                            size="sm"
                            className="border-blue-300 text-blue-600 hover:bg-blue-50"
                          >
                            ✏️ {translate("edit")}
                          </Button>
                          <Button
                            onClick={() => {
                              if (window.confirm(translate("confirm_delete_activity"))) {
                                const updated = {
                                  ...activeTrip,
                                  activities: ((activeTrip.activities as unknown as Activity[]) || []).filter((a: Activity) => a.id !== activity.id),
                                  updatedAt: new Date(),
                                };
                                const withProgress = { ...updated, progress: calculateProgress(updated) };
                                setActiveTrip(withProgress);
                                saveTrip(withProgress);
                              }
                            }}
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-300 hover:bg-red-50"
                          >
                            {translate("delete")}
                          </Button>
                        </div>
                      </div>
                    ))}
                  {[...((activeTrip.activities as unknown as Activity[]) || [])]
                    .filter((a: Activity) => !a.approved)
                    .map((activity) => {
                      const voteCount = activity.votes.length;
                      const hasVoted = activity.votes.includes(user.id);
                      return (
                        <div key={activity.id} className="p-4 border-2 border-orange-200 rounded-xl bg-white/80 shadow-sm">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="font-semibold text-gray-800 flex items-center gap-2">
                                {activity.name}
                                {renderStatusBadge(activity.status || "new")}
                              </div>
                              <div className="text-sm text-gray-600 mt-1">{activity.description}</div>
                              <div className="text-sm text-gray-500 mt-1">📍 {activity.address}</div>
                              {activity.link && (
                                <a
                                  href={activity.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 text-sm hover:underline mt-1 inline-block font-medium"
                                >
                                  🔗 {translate("link")}
                                </a>
                              )}
                              {((activity.price || 0) > 0) && (
                                <div className="text-sm font-semibold text-green-600 mt-2">
                                  {translate("price")}: {(activity.price || 0).toFixed(2)} {activity.currency || "EUR"}
                                </div>
                              )}
                            </div>
                          </div>
                          {activity.imageUrl && (
                            <img
                              src={activity.imageUrl}
                              alt={activity.name}
                              className="w-full h-48 object-cover rounded-lg mt-2 shadow-md"
                            />
                          )}
                          <div className="flex items-center gap-3 mt-3">
                            <Button
                              onClick={() => {
                                const updated = {
                                  ...activeTrip,
                                  activities: ((activeTrip.activities as unknown as Activity[]) || []).map((a: Activity) =>
                                    a.id === activity.id
                                      ? {
                                          ...a,
                                          votes: hasVoted
                                            ? a.votes.filter(id => id !== user.id)
                                            : [...a.votes, user.id],
                                        }
                                      : a
                                  ),
                                  updatedAt: new Date(),
                                };
                                setActiveTrip(updated);
                                saveTrip(updated);
                              }}
                              variant={hasVoted ? "default" : "outline"}
                              size="sm"
                              className={hasVoted ? "bg-blue-600" : "border-blue-300 text-blue-600 hover:bg-blue-50"}
                            >
                              {hasVoted ? translate("voted") : translate("vote")} ({voteCount})
                            </Button>
                            <Button
                              onClick={() => {
                                setEditingItem(activity);
                                setNewActivity({
                                  name: activity.name,
                                  description: activity.description,
                                  imageUrl: activity.imageUrl,
                                  link: activity.link,
                                  address: activity.address,
                                  day: activity.day,
                                  time: activity.time,
                                  status: (activity.status || "new") as "new" | "possible" | "rejected" | "approved",
                                  currency: activity.currency || "EUR",
                                  price: activity.price?.toString() || "",
                                });
                                setEditActivityDialogOpen(true);
                                setFormErrors({});
                              }}
                              variant="outline"
                              size="sm"
                              className="border-blue-300 text-blue-600 hover:bg-blue-50"
                            >
                              ✏️ {translate("edit")}
                            </Button>
                            {activeTrip.createdBy === user.id && (
                              <Button
                                onClick={async () => {
                                  const updated = {
                                    ...activeTrip,
                                    activities: ((activeTrip.activities as unknown as Activity[]) || []).map((a: Activity) => ({
                                      ...a,
                                      approved: a.id === activity.id,
                                    })),
                                    updatedAt: new Date(),
                                  };
                                  setActiveTrip(updated);
                                  await saveTrip(updated);
                                }}
                                variant="outline"
                                size="sm"
                                className="text-green-600 border-green-600 hover:bg-green-50"
                              >
                                {translate("approve")}
                              </Button>
                            )}
                            <Button
                              onClick={async () => {
                                if (window.confirm(translate("confirm_delete_activity"))) {
                                  const updated = {
                                    ...activeTrip,
                                    activities: ((activeTrip.activities as unknown as Activity[]) || []).filter((a: Activity) => a.id !== activity.id),
                                    updatedAt: new Date(),
                                  };
                                  const withProgress = { ...updated, progress: calculateProgress(updated) };
                                  setActiveTrip(withProgress);
                                  await saveTrip(withProgress);
                                }
                              }}
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-300 hover:bg-red-50"
                            >
                              {translate("delete")}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  {((activeTrip.activities as unknown as Activity[])?.length || 0) === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      <div className="text-4xl mb-2">🎯</div>
                      <p className="text-sm">{translate("no_activities")}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Accommodations Section - Separate Block */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="shadow-2xl border-0 bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 backdrop-blur-sm hover:shadow-3xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
                    🏠 {translate("accommodation")}
                  </h2>
                  <Button
                    onClick={() => {
                      setFormErrors({});
                      setAccommodationDialogOpen(true);
                    }}
                    variant="outline"
                    size="sm"
                    className="border-purple-300 text-purple-600 hover:bg-purple-50"
                  >
                    + {translate("add_accommodation")}
                  </Button>
                </div>
                <div className="space-y-3">
                  {(activeTrip.accommodations || []).map((acc) => (
                    <div key={acc.id} className="p-4 border-2 border-purple-200 rounded-xl bg-white/80 shadow-sm hover:border-purple-300 transition-all">
                      <div className="flex items-start gap-4">
                        {acc.imageUrl && (
                          <img
                            src={acc.imageUrl}
                            alt={acc.name}
                            className="w-32 h-32 object-cover rounded-lg shadow-md"
                          />
                        )}
                        <div className="flex-1">
                          <div className="font-semibold text-lg text-gray-800 flex items-center gap-2">
                            {acc.name}
                            {renderStatusBadge(acc.status || "new")}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">📍 {acc.address}</div>
                          <div className="text-sm text-gray-500 mt-1">{acc.description}</div>
                          <div className="text-sm mt-2 bg-purple-50 px-3 py-1 rounded-full inline-block">
                            <span className="font-medium text-purple-700">{translate("check_in")}:</span> {acc.checkIn} | <span className="font-medium text-purple-700">{translate("check_out")}:</span> {acc.checkOut}
                          </div>
                          {acc.price > 0 && (
                            <div className="text-sm font-semibold text-green-600 mt-2">
                              {translate("price")}: {acc.price.toFixed(2)} {acc.currency || "EUR"}
                            </div>
                          )}
                          {acc.bookingLink && (
                            <a
                              href={acc.bookingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 text-sm hover:underline mt-2 inline-block font-medium"
                            >
                              🔗 {translate("open_booking")}
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2 px-1">
                        <span className="text-sm text-gray-500 flex items-center gap-1">
                          👥 {translate("guests")}: {acc.guests || 1}
                        </span>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button
                          onClick={() => {
                            const hasVoted = (acc.votes || []).includes(user.id);
                            const updated = {
                              ...activeTrip,
                              accommodations: (activeTrip.accommodations || []).map((a: Accommodation) =>
                                a.id === acc.id
                                  ? {
                                      ...a,
                                      votes: hasVoted
                                        ? (a.votes || []).filter(id => id !== user.id)
                                        : [...(a.votes || []), user.id],
                                    }
                                  : a
                              ),
                              updatedAt: new Date(),
                            };
                            setActiveTrip(updated);
                            saveTrip(updated);
                          }}
                          variant={(acc.votes || []).includes(user.id) ? "default" : "outline"}
                          size="sm"
                          className={(acc.votes || []).includes(user.id) ? "bg-blue-600" : "border-blue-300 text-blue-600 hover:bg-blue-50"}
                        >
                          {(acc.votes || []).includes(user.id) ? translate("voted") : translate("vote")} ({(acc.votes || []).length})
                        </Button>
                        <Button
                          onClick={() => {
                            setEditingItem(acc);
                            setNewAccommodation({
                              name: acc.name,
                              address: acc.address,
                              imageUrl: acc.imageUrl,
                              bookingLink: acc.bookingLink,
                              description: acc.description,
                              checkIn: acc.checkIn,
                              checkOut: acc.checkOut,
                              price: acc.price.toString(),
                              status: (acc.status || "new") as "new" | "possible" | "rejected" | "approved",
                              currency: acc.currency || "EUR",
                              guests: acc.guests || 1,
                            });
                            setEditAccommodationDialogOpen(true);
                            setFormErrors({});
                          }}
                          variant="outline"
                          size="sm"
                          className="border-blue-300 text-blue-600 hover:bg-blue-50"
                        >
                          ✏️ {translate("edit")}
                        </Button>
                        <Button
                          onClick={() => {
                            if (window.confirm(translate("confirm_delete_accommodation"))) {
                              const updated = {
                                ...activeTrip,
                                accommodations: (activeTrip.accommodations || []).filter(a => a.id !== acc.id),
                                updatedAt: new Date(),
                              };
                              const withProgress = { ...updated, progress: calculateProgress(updated) };
                              setActiveTrip(withProgress);
                              saveTrip(withProgress);
                            }
                          }}
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          {translate("delete")}
                        </Button>
                      </div>
                    </div>
                  ))}
                  {(activeTrip.accommodations || []).length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      <div className="text-4xl mb-2">🏠</div>
                      <p className="text-sm">{translate("no_accommodation")}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Transport Section - Separate Block */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <Card className="shadow-2xl border-0 bg-gradient-to-br from-white via-indigo-50/30 to-cyan-50/30 backdrop-blur-sm hover:shadow-3xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent flex items-center gap-2">
                    🚗 {translate("transport")}
                  </h2>
                  <Button
                    onClick={() => {
                      setFormErrors({});
                      setTransportDialogOpen(true);
                    }}
                    variant="outline"
                    size="sm"
                    className="border-indigo-300 text-indigo-600 hover:bg-indigo-50"
                  >
                    + {translate("add_transport")}
                  </Button>
                </div>
                <div className="space-y-3">
                  {(activeTrip.transports || []).map((tr) => {
                    const typeIcons = {
                      plane: "✈️",
                      train: "🚂",
                      bus: "🚌",
                      car: "🚗",
                      ship: "🚢",
                      other: "🚛",
                    };
                    return (
                      <div key={tr.id} className="p-4 border-2 border-indigo-200 rounded-xl bg-white/80 shadow-sm hover:border-indigo-300 transition-all">
                        <div className="flex items-start gap-3 mb-2">
                          <span className="text-3xl">{typeIcons[tr.type]}</span>
                          <div className="flex-1">
                            <div className="font-semibold text-lg capitalize text-gray-800 flex items-center gap-2">
                              {tr.type}
                              {renderStatusBadge(tr.status || "new")}
                            </div>
                            <div className="text-sm text-gray-600 mt-1 font-medium">
                              {tr.from} → {tr.to}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              {translate("departure_time")}: {tr.departureTime} {translate("from")} {tr.departurePlace}
                            </div>
                            {tr.arrivalTime && (
                              <div className="text-sm text-gray-500">
                                {translate("arrival_time")}: {tr.arrivalTime} {translate("to")} {tr.arrivalPlace}
                              </div>
                            )}
                            <div className="text-sm text-gray-500 mt-1">
                              {translate("passengers")}: {tr.passengers}
                            </div>
                            {tr.price > 0 && (
                              <div className="text-sm font-semibold text-green-600 mt-2">
                                {translate("price")}: {tr.price.toFixed(2)} {tr.currency || "EUR"}
                              </div>
                            )}
                            {tr.description && (
                              <div className="text-sm text-gray-600 mt-1">{tr.description}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button
                            onClick={() => {
                              setEditingItem(tr);
                              setNewTransport({
                                type: tr.type,
                                from: tr.from,
                                to: tr.to,
                                departureTime: tr.departureTime,
                                departurePlace: tr.departurePlace,
                                arrivalTime: tr.arrivalTime,
                                arrivalPlace: tr.arrivalPlace,
                                passengers: tr.passengers,
                                description: tr.description,
                                imageUrl: tr.imageUrl || "",
                                status: (tr.status || "new") as "new" | "possible" | "rejected" | "approved",
                                 currency: tr.currency || "EUR",
                                 price: tr.price?.toString() || "",
                               });
                               setEditTransportDialogOpen(true);
                               setFormErrors({});
                             }}
                            variant="outline"
                            size="sm"
                            className="border-blue-300 text-blue-600 hover:bg-blue-50"
                          >
                            ✏️ {translate("edit")}
                          </Button>
                          <Button
                            onClick={() => {
                              if (window.confirm(translate("delete_transport_confirm"))) {
                                const updated = {
                                  ...activeTrip,
                                  transports: (activeTrip.transports || []).filter(t => t.id !== tr.id),
                                  updatedAt: new Date(),
                                };
                                const withProgress = { ...updated, progress: calculateProgress(updated) };
                                setActiveTrip(withProgress);
                                saveTrip(withProgress);
                              }
                            }}
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-300 hover:bg-red-50"
                          >
                            {translate("delete")}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {(activeTrip.transports || []).length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      <div className="text-4xl mb-2">🚗</div>
                      <p className="text-sm">{translate("no_transport")}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>



          <Dialog open={inviteDialogOpen} onOpenChange={(open) => {
            setInviteDialogOpen(open);
            if (!open) setFormErrors({});
          }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{translate("invite_participant_title")}</DialogTitle>
                <DialogDescription>
                  {translate("invite_participant_desc")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="invite_email" required>{translate("participant_email")}</Label>
                  <Input
                    id="invite_email"
                    type="email"
                    placeholder="Email участника"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    error={!!formErrors.invite}
                    className="h-12"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        inviteUserToTrip();
                      }
                    }}
                  />
                  {formErrors.invite && <p className="text-red-500 text-sm">{formErrors.invite}</p>}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                  {translate("cancel")}
                </Button>
                <Button
                  onClick={inviteUserToTrip}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {translate("invite")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Expense Dialog */}
          <Dialog open={expenseDialogOpen} onOpenChange={(open) => {
            setExpenseDialogOpen(open);
            if (!open) setFormErrors({});
          }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{translate("add_expense")}</DialogTitle>
                <DialogDescription>
                  {translate("add_expense_desc")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="expense_desc" required>{translate("expense_description")}</Label>
                  <Input
                    id="expense_desc"
                    placeholder={translate("expense_description")}
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                    error={!!formErrors.description}
                    className="h-12"
                  />
                  {formErrors.description && <p className="text-red-500 text-sm">{formErrors.description}</p>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="expense_amount" required>{translate("amount")}</Label>
                    <Input
                      id="expense_amount"
                      type="number"
                      placeholder={translate("amount")}
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                      error={!!formErrors.amount}
                      className="h-12"
                    />
                    {formErrors.amount && <p className="text-red-500 text-sm">{formErrors.amount}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label>{translate("currency")}</Label>
                    <select
                      value={newExpense.currency || activeTrip?.currency || "RUB"}
                      onChange={(e) => setNewExpense({ ...newExpense, currency: e.target.value })}
                      className="h-12 w-full px-3 border rounded-md"
                    >
                      <option value="RUB">₽ RUB</option>
                      <option value="USD">$ USD</option>
                      <option value="EUR">€ EUR</option>
                      <option value="GBP">£ GBP</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold mb-2 block">{translate("category")}</label>
                  <select
                    value={newExpense.category}
                    onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                    className="w-full h-12 px-3 border rounded-md"
                  >
                    <option value="">{translate("category_other")}</option>
                    <option value={translate("category_transport")}>{translate("category_transport")}</option>
                    <option value={translate("category_accommodation")}>{translate("category_accommodation")}</option>
                    <option value={translate("category_food")}>{translate("category_food")}</option>
                    <option value={translate("category_shopping")}>{translate("category_shopping")}</option>
                    <option value={translate("category_entertainment")}>{translate("category_entertainment")}</option>
                    <option value={translate("category_cafe")}>{translate("category_cafe")}</option>
                    <option value={translate("category_other")}>{translate("category_other")}</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold mb-2 block">
                    {translate("split_between")}
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {tripUsers.map((u) => (
                      <label key={u.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newExpense.sharedBy.includes(u.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewExpense({
                                ...newExpense,
                                sharedBy: [...newExpense.sharedBy, u.id],
                              });
                            } else {
                              setNewExpense({
                                ...newExpense,
                                sharedBy: newExpense.sharedBy.filter(id => id !== u.id),
                              });
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <span>{u.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setExpenseDialogOpen(false)}>
                  {translate("cancel")}
                </Button>
                <Button
                  onClick={addExpense}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {translate("add_generic")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Place Dialog */}
          <Dialog open={placeDialogOpen} onOpenChange={(open) => {
            setPlaceDialogOpen(open);
            if (!open) setFormErrors({});
          }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{placeDialogOpen && !editingItem ? translate("add_place") : translate("edit")}</DialogTitle>
                <DialogDescription>
                  {placeDialogOpen && !editingItem ? translate("add_place") : translate("edit")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="place_name" required>{translate("place_name")}</Label>
                  <Input
                    id="place_name"
                    placeholder={translate("place_name")}
                    value={newPlace.name}
                    onChange={(e) => setNewPlace({ ...newPlace, name: e.target.value })}
                    error={!!formErrors.name}
                    className="h-12"
                  />
                  {formErrors.name && <p className="text-red-500 text-sm">{formErrors.name}</p>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={newPlace.currency}
                    onChange={(e) => setNewPlace({ ...newPlace, currency: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md h-12"
                  >
                    <option value="EUR">EUR</option>
                    <option value="RUB">RUB</option>
                    <option value="USD">USD</option>
                  </select>
                  <Input
                    type="number"
                    placeholder={translate("cost")}
                    value={newPlace.price}
                    onChange={(e) => setNewPlace({ ...newPlace, price: e.target.value })}
                    className="h-12"
                  />
                </div>
                <Input
                  placeholder={translate("address")}
                  value={newPlace.address}
                  onChange={(e) => setNewPlace({ ...newPlace, address: e.target.value })}
                  className="h-12"
                />
                <Input
                  placeholder={translate("google_maps_link")}
                  value={newPlace.googleMapsLink}
                  onChange={(e) => setNewPlace({ ...newPlace, googleMapsLink: e.target.value })}
                  className="h-12"
                />
                <div>
                  <label className="text-sm font-semibold mb-2 block">
                    {translate("status")}
                  </label>
                  <select
                    value={newPlace.status}
                    onChange={(e) => setNewPlace({ ...newPlace, status: e.target.value as "new" | "possible" | "rejected" | "approved" })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="new">{translate("status_new")}</option>
                    <option value="possible">{translate("status_possible")}</option>
                    <option value="rejected">{translate("status_rejected")}</option>
                    <option value="approved">{translate("status_approved")}</option>
                  </select>
                </div>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={placeFileInputRef}
                    onChange={handlePlaceImageUpload}
                  />
                  <Button 
                    type="button"
                    variant="outline" 
                    className="w-full"
                    onClick={() => placeFileInputRef.current?.click()}
                  >
                    {newPlace.imageUrl ? translate("image_uploaded") : translate("upload_image")}
                  </Button>
                </div>
                {newPlace.imageUrl && (
                  <img src={newPlace.imageUrl} alt="Preview" className="w-full h-32 object-cover rounded" />
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPlaceDialogOpen(false)}>
                  {translate("cancel")}
                </Button>
                <Button
                  onClick={addPlace}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {translate("add_generic")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Activity Dialog */}
          <Dialog open={activityDialogOpen} onOpenChange={(open) => {
            setActivityDialogOpen(open);
            if (!open) setFormErrors({});
          }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{translate("add_activity")}</DialogTitle>
                <DialogDescription>
                  {translate("activity_desc_placeholder")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="activity_name" required>{translate("activity_name")}</Label>
                  <Input
                    id="activity_name"
                    placeholder={translate("activity_name")}
                    value={newActivity.name}
                    onChange={(e) => setNewActivity({ ...newActivity, name: e.target.value })}
                    error={!!formErrors.name}
                    className="h-12"
                  />
                  {formErrors.name && <p className="text-red-500 text-sm">{formErrors.name}</p>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={newActivity.currency}
                    onChange={(e) => setNewActivity({ ...newActivity, currency: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md h-12"
                  >
                    <option value="EUR">EUR</option>
                    <option value="RUB">RUB</option>
                    <option value="USD">USD</option>
                  </select>
                  <Input
                    type="number"
                    placeholder={translate("cost")}
                    value={newActivity.price}
                    onChange={(e) => setNewActivity({ ...newActivity, price: e.target.value })}
                    className="h-12"
                  />
                </div>
                <Textarea
                  placeholder="Описание"
                  value={newActivity.description}
                  onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                  className="min-h-[80px]"
                />
                <Input
                  placeholder="Адрес"
                  value={newActivity.address}
                  onChange={(e) => setNewActivity({ ...newActivity, address: e.target.value })}
                  className="h-12"
                />
                <Input
                  placeholder="Ссылка"
                  value={newActivity.link}
                  onChange={(e) => setNewActivity({ ...newActivity, link: e.target.value })}
                  className="h-12"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    placeholder={translate("trip_day")}
                    value={newActivity.day}
                    onChange={(e) => setNewActivity({ ...newActivity, day: parseInt(e.target.value) || 1 })}
                    className="h-12"
                  />
                  <Input
                    placeholder={translate("time_placeholder")}
                    value={newActivity.time}
                    onChange={(e) => setNewActivity({ ...newActivity, time: e.target.value })}
                    className="h-12"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>{translate("status")}</Label>
                  <select
                    value={newActivity.status}
                    onChange={(e) => setNewActivity({ ...newActivity, status: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-md h-12"
                  >
                    <option value="new">{translate("status_new")}</option>
                    <option value="possible">{translate("status_possible")}</option>
                    <option value="rejected">{translate("status_rejected")}</option>
                    <option value="approved">{translate("status_approved")}</option>
                  </select>
                </div>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={activityFileInputRef}
                    onChange={handleActivityImageUpload}
                  />
                  <Button 
                    type="button"
                    variant="outline" 
                    className="w-full"
                    onClick={() => activityFileInputRef.current?.click()}
                  >
                    {newActivity.imageUrl ? translate("image_uploaded") : translate("upload_image")}
                  </Button>
                </div>
                {newActivity.imageUrl && (
                  <img src={newActivity.imageUrl} alt="Preview" className="w-full h-32 object-cover rounded" />
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setActivityDialogOpen(false)}>
                  {translate("cancel")}
                </Button>
                <Button
                  onClick={addActivity}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {translate("add_generic")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Accommodation Dialog */}
          <Dialog open={accommodationDialogOpen} onOpenChange={(open) => {
            setAccommodationDialogOpen(open);
            if (!open) setFormErrors({});
          }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{accommodationDialogOpen && !editingItem ? translate("add_accommodation") : translate("edit")}</DialogTitle>
                <DialogDescription>
                  {accommodationDialogOpen && !editingItem ? translate("add_accommodation") : translate("edit")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="hotel_name" required>{translate("hotel_name")}</Label>
                  <Input
                    id="hotel_name"
                    placeholder={translate("hotel_name")}
                    value={newAccommodation.name}
                    onChange={(e) => setNewAccommodation({ ...newAccommodation, name: e.target.value })}
                    error={!!formErrors.name}
                    className="h-12"
                  />
                  {formErrors.name && <p className="text-red-500 text-sm">{formErrors.name}</p>}
                </div>
                <Input
                  placeholder="Адрес"
                  value={newAccommodation.address}
                  onChange={(e) => setNewAccommodation({ ...newAccommodation, address: e.target.value })}
                  className="h-12"
                />
                <Input
                  placeholder="Ссылка на Booking.com"
                  value={newAccommodation.bookingLink}
                  onChange={(e) => setNewAccommodation({ ...newAccommodation, bookingLink: e.target.value })}
                  className="h-12"
                />
                <Textarea
                  placeholder="Описание"
                  value={newAccommodation.description}
                  onChange={(e) => setNewAccommodation({ ...newAccommodation, description: e.target.value })}
                  className="min-h-[80px]"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    placeholder={translate("check_in")}
                    value={newAccommodation.checkIn}
                    onChange={(e) => setNewAccommodation({ ...newAccommodation, checkIn: e.target.value })}
                    className="h-12"
                  />
                  <Input
                    type="date"
                    placeholder={translate("check_out")}
                    value={newAccommodation.checkOut}
                    onChange={(e) => setNewAccommodation({ ...newAccommodation, checkOut: e.target.value })}
                    className="h-12"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="accommodation_price">{translate("price")}</Label>
                  <Input
                    id="accommodation_price"
                    type="number"
                    placeholder={translate("price")}
                    value={newAccommodation.price}
                    onChange={(e) => setNewAccommodation({ ...newAccommodation, price: e.target.value })}
                    className="h-12"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="accommodation_guests">{translate("guests")}</Label>
                  <Input
                    id="accommodation_guests"
                    type="number"
                    placeholder={translate("guests")}
                    value={newAccommodation.guests}
                    onChange={(e) => setNewAccommodation({ ...newAccommodation, guests: parseInt(e.target.value) || 1 })}
                    className="h-12"
                  />
                </div>
                <select
                  value={newAccommodation.currency}
                  onChange={(e) => setNewAccommodation({ ...newAccommodation, currency: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md h-12"
                >
                  <option value="EUR">EUR</option>
                  <option value="RUB">RUB</option>
                  <option value="USD">USD</option>
                </select>
                <div className="flex flex-col gap-2">
                  <Label>{translate("status")}</Label>
                  <select
                    value={newAccommodation.status}
                    onChange={(e) => setNewAccommodation({ ...newAccommodation, status: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-md h-12"
                  >
                    <option value="new">{translate("status_new")}</option>
                    <option value="possible">{translate("status_possible")}</option>
                    <option value="rejected">{translate("status_rejected")}</option>
                    <option value="approved">{translate("status_approved")}</option>
                  </select>
                </div>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={accommodationFileInputRef}
                    onChange={handleAccommodationImageUpload}
                  />
                  <Button 
                    type="button"
                    variant="outline" 
                    className="w-full"
                    onClick={() => accommodationFileInputRef.current?.click()}
                  >
                    {newAccommodation.imageUrl ? translate("image_uploaded") : translate("upload_image")}
                  </Button>
                </div>
                {newAccommodation.imageUrl && (
                  <img src={newAccommodation.imageUrl} alt="Preview" className="w-full h-32 object-cover rounded" />
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAccommodationDialogOpen(false)}>
                  {translate("cancel")}
                </Button>
                <Button
                  onClick={addAccommodation}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {translate("add_generic")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Transport Dialog */}
          <Dialog open={transportDialogOpen} onOpenChange={(open) => {
            setTransportDialogOpen(open);
            if (!open) setFormErrors({});
          }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{translate("add_transport")}</DialogTitle>
                <DialogDescription>
                  {translate("transport_desc")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold mb-2 block">{translate("transport_type")}</label>
                  <select
                    value={newTransport.type}
                    onChange={(e) => setNewTransport({ ...newTransport, type: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-md h-12"
                  >
                    <option value="plane">{translate("transport_plane")}</option>
                    <option value="train">{translate("transport_train")}</option>
                    <option value="bus">{translate("transport_bus")}</option>
                    <option value="car">{translate("transport_car")}</option>
                    <option value="ship">{translate("transport_ship")}</option>
                    <option value="other">{translate("transport_other")}</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="transport_from" required>{translate("from")}</Label>
                    <Input
                      id="transport_from"
                      placeholder={translate("from")}
                      value={newTransport.from}
                      onChange={(e) => setNewTransport({ ...newTransport, from: e.target.value })}
                      error={!!formErrors.from}
                      className="h-12"
                    />
                    {formErrors.from && <p className="text-red-500 text-sm">{formErrors.from}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="transport_to" required>{translate("to")}</Label>
                    <Input
                      id="transport_to"
                      placeholder={translate("to")}
                      value={newTransport.to}
                      onChange={(e) => setNewTransport({ ...newTransport, to: e.target.value })}
                      error={!!formErrors.to}
                      className="h-12"
                    />
                    {formErrors.to && <p className="text-red-500 text-sm">{formErrors.to}</p>}
                  </div>
                </div>
                <Input
                  placeholder="Время отправления"
                  value={newTransport.departureTime}
                  onChange={(e) => setNewTransport({ ...newTransport, departureTime: e.target.value })}
                  className="h-12"
                />
                <Input
                  placeholder="Место отправления"
                  value={newTransport.departurePlace}
                  onChange={(e) => setNewTransport({ ...newTransport, departurePlace: e.target.value })}
                  className="h-12"
                />
                <Input
                  placeholder="Время прибытия"
                  value={newTransport.arrivalTime}
                  onChange={(e) => setNewTransport({ ...newTransport, arrivalTime: e.target.value })}
                  className="h-12"
                />
                <Input
                  placeholder="Место прибытия"
                  value={newTransport.arrivalPlace}
                  onChange={(e) => setNewTransport({ ...newTransport, arrivalPlace: e.target.value })}
                  className="h-12"
                />
                <div className="space-y-1">
                  <Label htmlFor="transport_passengers">{translate("passengers")}</Label>
                  <Input
                    id="transport_passengers"
                    type="number"
                    placeholder={translate("passengers")}
                    value={newTransport.passengers}
                    onChange={(e) => setNewTransport({ ...newTransport, passengers: parseInt(e.target.value) || 1 })}
                    className="h-12"
                  />
                </div>
                <Textarea
                  placeholder="Описание"
                  value={newTransport.description}
                  onChange={(e) => setNewTransport({ ...newTransport, description: e.target.value })}
                  className="min-h-[80px]"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={newTransport.currency}
                    onChange={(e) => setNewTransport({ ...newTransport, currency: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md h-12"
                  >
                    <option value="EUR">EUR</option>
                    <option value="RUB">RUB</option>
                    <option value="USD">USD</option>
                  </select>
                  <Input
                    type="number"
                    placeholder={translate("cost")}
                    value={newTransport.price}
                    onChange={(e) => setNewTransport({ ...newTransport, price: e.target.value })}
                    className="h-12"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="text-sm font-medium text-gray-700">{translate("image") || "Изображение"}</div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={transportFileInputRef}
                    onChange={handleTransportImageUpload}
                  />
                  <Button 
                    type="button"
                    variant="outline" 
                    className="w-full"
                    onClick={() => transportFileInputRef.current?.click()}
                  >
                    {newTransport.imageUrl ? translate("image_uploaded") : translate("upload_image")}
                  </Button>
                  {newTransport.imageUrl && (
                    <img
                      src={newTransport.imageUrl}
                      alt="Transport"
                      className="w-full h-32 object-cover rounded-md mt-2"
                    />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Label>{translate("status")}</Label>
                  <select
                    value={newTransport.status}
                    onChange={(e) => setNewTransport({ ...newTransport, status: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-md h-12"
                  >
                    <option value="new">{translate("status_new")}</option>
                    <option value="possible">{translate("status_possible")}</option>
                    <option value="rejected">{translate("status_rejected")}</option>
                    <option value="approved">{translate("status_approved")}</option>
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setTransportDialogOpen(false)}>
                  {translate("cancel")}
                </Button>
                <Button
                  onClick={addTransport}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {translate("add_generic")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Share Dialog */}
          <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{translate("share_link")}</DialogTitle>
                <DialogDescription>
                  {translate("share_link")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={shareLink}
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(shareLink);
                        alert(translate("link_copied"));
                      } catch (error) {
                        alert(translate("link_copied"));
                      }
                    }}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    {translate("copy")}
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShareDialogOpen(false)}>
                  {translate("cancel")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Trip Name Dialog */}
          <Dialog open={editTripNameDialogOpen} onOpenChange={(open) => {
            setEditTripNameDialogOpen(open);
            if (!open) setFormErrors({});
          }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{translate("edit")} {translate("name")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="trip-name" required>{translate("name")}</Label>
                  <Input
                    id="trip-name"
                    placeholder={translate("name")}
                    value={editingItem?.name || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    error={!!formErrors.name}
                    className="h-12"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        updateTripName();
                      }
                    }}
                  />
                  {formErrors.name && <p className="text-red-500 text-sm">{formErrors.name}</p>}
                </div>
                
                  <div className="flex flex-col gap-2">
                    <div className="text-sm font-medium text-gray-700">{translate("image")} (Cover)</div>
                    <input
                      type="file"
                      id="trip-cover-upload"
                      accept="image/*"
                      className="hidden"
                      onChange={handleTripCoverImageUpload}
                    />
                    <label 
                      htmlFor="trip-cover-upload"
                      className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 w-full cursor-pointer"
                    >
                      {activeTrip?.coverImage ? translate("image_uploaded") : translate("upload_image")}
                    </label>
                  {activeTrip?.coverImage && (
                    <div className="mt-2 relative h-32 w-full rounded-md overflow-hidden">
                      <img
                        src={activeTrip.coverImage}
                        alt="Current Cover"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setEditTripNameDialogOpen(false);
                  setEditingItem(null);
                }}>
                  {translate("cancel")}
                </Button>
                <Button
                  onClick={updateTripName}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {translate("save")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Place Dialog */}
          <Dialog open={editPlaceDialogOpen} onOpenChange={(open) => {
            setEditPlaceDialogOpen(open);
            if (!open) setFormErrors({});
          }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{translate("edit")} {translate("place")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="place_name" required>{translate("place_name")}</Label>
                  <Input
                    id="place_name"
                    placeholder={translate("place_name")}
                    value={newPlace.name}
                    onChange={(e) => setNewPlace({ ...newPlace, name: e.target.value })}
                    error={!!formErrors.name}
                    className="h-12"
                  />
                  {formErrors.name && <p className="text-red-500 text-sm">{formErrors.name}</p>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={newPlace.currency}
                    onChange={(e) => setNewPlace({ ...newPlace, currency: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md h-12"
                  >
                    <option value="EUR">EUR</option>
                    <option value="RUB">RUB</option>
                    <option value="USD">USD</option>
                  </select>
                  <Input
                    type="number"
                    placeholder={translate("cost")}
                    value={newPlace.price}
                    onChange={(e) => setNewPlace({ ...newPlace, price: e.target.value })}
                    className="h-12"
                  />
                </div>
                <Input
                  placeholder={translate("address")}
                  value={newPlace.address}
                  onChange={(e) => setNewPlace({ ...newPlace, address: e.target.value })}
                  className="h-12"
                />
                <Input
                  placeholder={translate("google_maps_link")}
                  value={newPlace.googleMapsLink}
                  onChange={(e) => setNewPlace({ ...newPlace, googleMapsLink: e.target.value })}
                  className="h-12"
                />
                <div className="flex flex-col gap-2">
                  <Label>{translate("status")}</Label>
                  <select
                    value={newPlace.status}
                    onChange={(e) => setNewPlace({ ...newPlace, status: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-md h-12"
                  >
                    <option value="new">{translate("status_new")}</option>
                    <option value="possible">{translate("status_possible")}</option>
                    <option value="rejected">{translate("status_rejected")}</option>
                    <option value="approved">{translate("status_approved")}</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="text-sm font-medium text-gray-700">{translate("image")}</div>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handlePlaceImageUpload}
                    className="h-12"
                  />
                  {newPlace.imageUrl && (
                    <img
                      src={newPlace.imageUrl}
                      alt="Place"
                      className="w-full h-32 object-cover rounded-md mt-2"
                    />
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setEditPlaceDialogOpen(false);
                  setEditingItem(null);
                  setNewPlace({ name: "", address: "", imageUrl: "", googleMapsLink: "", status: "new", currency: "EUR", price: "" });
                }}>
                  {translate("cancel")}
                </Button>
                <Button
                  onClick={updatePlace}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {translate("save")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Activity Dialog */}
          <Dialog open={editActivityDialogOpen} onOpenChange={(open) => {
            setEditActivityDialogOpen(open);
            if (!open) setFormErrors({});
          }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{translate("edit")} {translate("activity_name")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="edit_activity_name" required>{translate("activity_name")}</Label>
                  <Input
                    id="edit_activity_name"
                    placeholder={translate("activity_name")}
                    value={newActivity.name}
                    onChange={(e) => setNewActivity({ ...newActivity, name: e.target.value })}
                    error={!!formErrors.name}
                    className="h-12"
                  />
                  {formErrors.name && <p className="text-red-500 text-sm">{formErrors.name}</p>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={newActivity.currency}
                    onChange={(e) => setNewActivity({ ...newActivity, currency: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md h-12"
                  >
                    <option value="EUR">EUR</option>
                    <option value="RUB">RUB</option>
                    <option value="USD">USD</option>
                  </select>
                  <Input
                    type="number"
                    placeholder={translate("cost")}
                    value={newActivity.price}
                    onChange={(e) => setNewActivity({ ...newActivity, price: e.target.value })}
                    className="h-12"
                  />
                </div>
                <Textarea
                  placeholder={translate("description")}
                  value={newActivity.description}
                  onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                  className="min-h-[80px]"
                />
                <Input
                  placeholder={translate("address")}
                  value={newActivity.address}
                  onChange={(e) => setNewActivity({ ...newActivity, address: e.target.value })}
                  className="h-12"
                />
                <Input
                  placeholder={translate("link")}
                  value={newActivity.link}
                  onChange={(e) => setNewActivity({ ...newActivity, link: e.target.value })}
                  className="h-12"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    placeholder={translate("day")}
                    value={newActivity.day}
                    onChange={(e) => setNewActivity({ ...newActivity, day: parseInt(e.target.value) || 1 })}
                    className="h-12"
                  />
                  <Input
                    placeholder={translate("time")}
                    value={newActivity.time}
                    onChange={(e) => setNewActivity({ ...newActivity, time: e.target.value })}
                    className="h-12"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>{translate("status")}</Label>
                  <select
                    value={newActivity.status}
                    onChange={(e) => setNewActivity({ ...newActivity, status: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-md h-12"
                  >
                    <option value="new">{translate("status_new")}</option>
                    <option value="possible">{translate("status_possible")}</option>
                    <option value="rejected">{translate("status_rejected")}</option>
                    <option value="approved">{translate("status_approved")}</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={activityFileInputRef}
                    onChange={handleActivityImageUpload}
                  />
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => activityFileInputRef.current?.click()}
                  >
                    {newActivity.imageUrl ? translate("image_uploaded") : translate("upload_image")}
                  </Button>
                </div>
                {newActivity.imageUrl && (
                  <img src={newActivity.imageUrl} alt="Preview" className="w-full h-32 object-cover rounded" />
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setEditActivityDialogOpen(false);
                  setEditingItem(null);
                  setNewActivity({ name: "", description: "", imageUrl: "", link: "", address: "", day: 1, time: "", status: "new", currency: "EUR", price: "" });
                }}>
                  {translate("cancel")}
                </Button>
                <Button
                  onClick={updateActivity}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {translate("save")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Accommodation Dialog */}
          <Dialog open={editAccommodationDialogOpen} onOpenChange={(open) => {
            setEditAccommodationDialogOpen(open);
            if (!open) setFormErrors({});
          }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{translate("edit")} {translate("accommodation")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="edit_hotel_name" required>{translate("hotel_name")}</Label>
                  <Input
                    id="edit_hotel_name"
                    placeholder={translate("hotel_name")}
                    value={newAccommodation.name}
                    onChange={(e) => setNewAccommodation({ ...newAccommodation, name: e.target.value })}
                    error={!!formErrors.name}
                    className="h-12"
                  />
                  {formErrors.name && <p className="text-red-500 text-sm">{formErrors.name}</p>}
                </div>
                <select
                  value={newAccommodation.currency}
                  onChange={(e) => setNewAccommodation({ ...newAccommodation, currency: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md h-12"
                >
                  <option value="EUR">EUR</option>
                  <option value="RUB">RUB</option>
                  <option value="USD">USD</option>
                </select>
                <Input
                  placeholder={translate("address")}
                  value={newAccommodation.address}
                  onChange={(e) => setNewAccommodation({ ...newAccommodation, address: e.target.value })}
                  className="h-12"
                />
                <Input
                  placeholder={translate("booking_link")}
                  value={newAccommodation.bookingLink}
                  onChange={(e) => setNewAccommodation({ ...newAccommodation, bookingLink: e.target.value })}
                  className="h-12"
                />
                <Textarea
                  placeholder={translate("description")}
                  value={newAccommodation.description}
                  onChange={(e) => setNewAccommodation({ ...newAccommodation, description: e.target.value })}
                  className="min-h-[80px]"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    placeholder={translate("check_in")}
                    value={newAccommodation.checkIn}
                    onChange={(e) => setNewAccommodation({ ...newAccommodation, checkIn: e.target.value })}
                    className="h-12"
                  />
                  <Input
                    type="date"
                    placeholder={translate("check_out")}
                    value={newAccommodation.checkOut}
                    onChange={(e) => setNewAccommodation({ ...newAccommodation, checkOut: e.target.value })}
                    className="h-12"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="edit_accommodation_price">{translate("price")}</Label>
                    <Input
                      id="edit_accommodation_price"
                      type="number"
                      placeholder={translate("price")}
                      value={newAccommodation.price}
                      onChange={(e) => setNewAccommodation({ ...newAccommodation, price: e.target.value })}
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit_accommodation_guests">{translate("guests")}</Label>
                    <Input
                      id="edit_accommodation_guests"
                      type="number"
                      placeholder={translate("guests")}
                      value={newAccommodation.guests}
                      onChange={(e) => setNewAccommodation({ ...newAccommodation, guests: parseInt(e.target.value) || 1 })}
                      className="h-12"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>{translate("status")}</Label>
                  <select
                    value={newAccommodation.status}
                    onChange={(e) => setNewAccommodation({ ...newAccommodation, status: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-md h-12"
                  >
                    <option value="new">{translate("status_new")}</option>
                    <option value="possible">{translate("status_possible")}</option>
                    <option value="rejected">{translate("status_rejected")}</option>
                    <option value="approved">{translate("status_approved")}</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={accommodationFileInputRef}
                    onChange={handleAccommodationImageUpload}
                  />
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => accommodationFileInputRef.current?.click()}
                  >
                    {newAccommodation.imageUrl ? translate("image_uploaded") : translate("upload_image")}
                  </Button>
                </div>
                {newAccommodation.imageUrl && (
                  <img src={newAccommodation.imageUrl} alt="Preview" className="w-full h-32 object-cover rounded" />
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setEditAccommodationDialogOpen(false);
                  setEditingItem(null);
                  setNewAccommodation({ name: "", address: "", imageUrl: "", bookingLink: "", description: "", checkIn: "", checkOut: "", price: "", status: "new", currency: "EUR", guests: 1 });
                }}>
                  {translate("cancel")}
                </Button>
                <Button
                  onClick={updateAccommodation}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {translate("save")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Transport Dialog */}
          <Dialog open={editTransportDialogOpen} onOpenChange={(open) => {
            setEditTransportDialogOpen(open);
            if (!open) setFormErrors({});
          }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{translate("edit")} {translate("transport")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <select
                  value={newTransport.type}
                  onChange={(e) => setNewTransport({ ...newTransport, type: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-md h-12"
                >
                  <option value="plane">✈️ {translate("transport_plane")}</option>
                  <option value="train">🚂 {translate("transport_train")}</option>
                  <option value="bus">🚌 {translate("transport_bus")}</option>
                  <option value="car">🚗 {translate("transport_car")}</option>
                  <option value="ship">🚢 {translate("transport_ship")}</option>
                  <option value="other">🚛 {translate("transport_other")}</option>
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={newTransport.currency}
                    onChange={(e) => setNewTransport({ ...newTransport, currency: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md h-12"
                  >
                    <option value="EUR">EUR</option>
                    <option value="RUB">RUB</option>
                    <option value="USD">USD</option>
                  </select>
                  <Input
                    type="number"
                    placeholder={translate("cost")}
                    value={newTransport.price}
                    onChange={(e) => setNewTransport({ ...newTransport, price: e.target.value })}
                    className="h-12"
                  />
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="transport_from" required>{translate("from")}</Label>
                      <Input
                        id="transport_from"
                        placeholder={translate("from")}
                        value={newTransport.from}
                        onChange={(e) => setNewTransport({ ...newTransport, from: e.target.value })}
                        error={!!formErrors.from}
                        className="h-12"
                      />
                      {formErrors.from && <p className="text-red-500 text-sm">{formErrors.from}</p>}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="transport_to" required>{translate("to")}</Label>
                      <Input
                        id="transport_to"
                        placeholder={translate("to")}
                        value={newTransport.to}
                        onChange={(e) => setNewTransport({ ...newTransport, to: e.target.value })}
                        error={!!formErrors.to}
                        className="h-12"
                      />
                      {formErrors.to && <p className="text-red-500 text-sm">{formErrors.to}</p>}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder={translate("departure_time")}
                    value={newTransport.departureTime}
                    onChange={(e) => setNewTransport({ ...newTransport, departureTime: e.target.value })}
                    className="h-12"
                  />
                  <Input
                    placeholder={translate("departure_place")}
                    value={newTransport.departurePlace}
                    onChange={(e) => setNewTransport({ ...newTransport, departurePlace: e.target.value })}
                    className="h-12"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder={translate("arrival_time")}
                    value={newTransport.arrivalTime}
                    onChange={(e) => setNewTransport({ ...newTransport, arrivalTime: e.target.value })}
                    className="h-12"
                  />
                  <Input
                    placeholder={translate("arrival_place")}
                    value={newTransport.arrivalPlace}
                    onChange={(e) => setNewTransport({ ...newTransport, arrivalPlace: e.target.value })}
                    className="h-12"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit_transport_passengers">{translate("passengers")}</Label>
                  <Input
                    id="edit_transport_passengers"
                    type="number"
                    placeholder={translate("passengers")}
                    value={newTransport.passengers}
                    onChange={(e) => setNewTransport({ ...newTransport, passengers: parseInt(e.target.value) || 1 })}
                    className="h-12"
                  />
                </div>
                <Textarea
                  placeholder={translate("description")}
                  value={newTransport.description}
                  onChange={(e) => setNewTransport({ ...newTransport, description: e.target.value })}
                  className="min-h-[80px]"
                />
                <select
                  value={newTransport.status}
                  onChange={(e) => setNewTransport({ ...newTransport, status: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-md h-12"
                >
                  <option value="new">{translate("status_new") || "Новое"}</option>
                  <option value="possible">{translate("status_possible") || "Возможно"}</option>
                  <option value="rejected">{translate("status_rejected") || "Отклонено"}</option>
                  <option value="approved">{translate("status_approved") || "Утверждено"}</option>
                </select>
                <div className="flex flex-col gap-2">
                  <div className="text-sm font-medium text-gray-700">{translate("image")}</div>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleTransportImageUpload}
                    className="h-12"
                  />
                  {newTransport.imageUrl && (
                    <img
                      src={newTransport.imageUrl}
                      alt="Transport"
                      className="w-full h-32 object-cover rounded-md mt-2"
                    />
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setEditTransportDialogOpen(false);
                  setEditingItem(null);
                  setNewTransport({ type: "plane", from: "", to: "", departureTime: "", departurePlace: "", arrivalTime: "", arrivalPlace: "", passengers: 1, description: "", imageUrl: "", status: "new", currency: "EUR", price: "" });
                }}>
                  {translate("cancel")}
                </Button>
                <Button
                  onClick={updateTransport}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {translate("save")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Expense Dialog */}
          <Dialog open={editExpenseDialogOpen} onOpenChange={(open) => {
            setEditExpenseDialogOpen(open);
            if (!open) setFormErrors({});
          }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{translate("edit")} {translate("expense_description")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="edit_expense_desc" required>{translate("expense_description")}</Label>
                  <Input
                    id="edit_expense_desc"
                    placeholder={translate("expense_description")}
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                    error={!!formErrors.description}
                    className="h-12"
                  />
                  {formErrors.description && <p className="text-red-500 text-sm">{formErrors.description}</p>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="edit_expense_amount" required>{translate("amount")}</Label>
                    <Input
                      id="edit_expense_amount"
                      type="number"
                      placeholder={translate("amount")}
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                      error={!!formErrors.amount}
                      className="h-12"
                    />
                    {formErrors.amount && <p className="text-red-500 text-sm">{formErrors.amount}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label>{translate("currency")}</Label>
                    <select
                      value={newExpense.currency || activeTrip?.currency || "RUB"}
                      onChange={(e) => setNewExpense({ ...newExpense, currency: e.target.value })}
                      className="h-12 w-full px-3 border rounded-md"
                    >
                      <option value="RUB">₽ RUB</option>
                      <option value="USD">$ USD</option>
                      <option value="EUR">€ EUR</option>
                      <option value="GBP">£ GBP</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold mb-2 block">{translate("category")}</label>
                  <select
                    value={newExpense.category}
                    onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                    className="w-full h-12 px-3 border rounded-md"
                  >
                    <option value="">{translate("category_other")}</option>
                    <option value={translate("category_transport")}>{translate("category_transport")}</option>
                    <option value={translate("category_accommodation")}>{translate("category_accommodation")}</option>
                    <option value={translate("category_food")}>{translate("category_food")}</option>
                    <option value={translate("category_shopping")}>{translate("category_shopping")}</option>
                    <option value={translate("category_entertainment")}>{translate("category_entertainment")}</option>
                    <option value={translate("category_cafe")}>{translate("category_cafe")}</option>
                    <option value={translate("category_other")}>{translate("category_other")}</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold mb-2 block">
                    {translate("participants")} ({translate("split_between")}):
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {tripUsers.map((u) => (
                      <label key={u.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newExpense.sharedBy.includes(u.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewExpense({
                                ...newExpense,
                                sharedBy: [...newExpense.sharedBy, u.id],
                              });
                            } else {
                              setNewExpense({
                                ...newExpense,
                                sharedBy: newExpense.sharedBy.filter(id => id !== u.id),
                              });
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <span>{u.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setEditExpenseDialogOpen(false);
                  setEditingItem(null);
                  setNewExpense({ description: "", amount: "", category: "", sharedBy: [], currency: activeTrip?.currency || "RUB" });
                }}>
                  {translate("cancel")}
                </Button>
                <Button
                  onClick={updateExpense}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {translate("save")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  }

  if (view === "chat" && activeTrip && user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6 pt-20">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4 mb-6"
          >
            <Button
              variant="ghost"
              onClick={() => setView("plan")}
              className="text-lg"
            >
              ← Назад
            </Button>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Чат поездки
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm h-[600px] flex flex-col">
              <CardContent className="p-6 flex-1 flex flex-col">
                <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
                  {activeTrip.chat.length === 0 ? (
                    <div className="text-center text-gray-400 py-12">
                      <div className="text-4xl mb-2">💬</div>
                      <p>Пока нет сообщений. Начните общение!</p>
                    </div>
                  ) : (
                    <AnimatePresence>
                      {activeTrip.chat.map((m, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className={`flex ${m.user === user.name ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                              m.user === user.name
                                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                                : "bg-gray-200 text-gray-800"
                            }`}
                          >
                            <div className="font-semibold text-sm mb-1">{m.user}</div>
                            <div className="text-sm">{m.text}</div>
                            {m.time && (
                              <div className="text-xs opacity-70 mt-1">
                                {new Date(m.time).toLocaleTimeString("ru-RU", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </div>
                <div className="flex gap-2 pt-4 border-t">
                  <Input
                    placeholder={translate("message")}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    className="flex-1 h-12"
                  />
                  <Button
                    onClick={sendMessage}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 h-12 px-6"
                  >
                     {translate("send")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  if (view === "summary" && activeTrip) {
    // tripUsers is already fetched in useEffect
    
    // Group activities by day (only approved)
    const activitiesArray = (activeTrip.activities as unknown as Activity[]) || [];
    const approvedActivities = activitiesArray.filter((a: Activity) => a.status === "approved" || a.approved);
    
    const activitiesByDay = [...approvedActivities]
      .reduce((acc, activity: Activity) => {
        const day = activity.day || 1;
        if (!acc[day]) acc[day] = [];
        acc[day].push(activity);
        return acc;
      }, {} as Record<number, Activity[]>);

    const maxDay = Math.max(0, ...Object.keys(activitiesByDay).map(Number));

    // Group activities by participant (only approved)
    const activitiesByParticipant = tripUsers.reduce((acc, user) => {
      const userActivities = approvedActivities.filter(a => (a.votes || []).includes(user.id));
      if (userActivities.length > 0) {
        acc[user.id] = userActivities;
      }
      return acc;
    }, {} as Record<string, Activity[]>);

    const approvedPlaces = (activeTrip.places || []).filter(p => p.status === "approved");
    const approvedTransports = (activeTrip.transports || []).filter(t => t.status === "approved");
    const approvedAccommodations = (activeTrip.accommodations || []).filter(a => a.status === "approved");

    const copySummary = () => {
      let text = `${translate("trip_plan")}: ${activeTrip.name}\n\n`;
      text += `${translate("participants")}: ${tripUsers.map(u => u.name).join(", ")}\n`;
      text += `${translate("total_spent")}: ${getTotalExpenses().toFixed(2)} ${activeTrip.currency || "RUB"}\n\n`;
      
      if (approvedPlaces.length > 0) {
        text += `${translate("places").toUpperCase()}:\n`;
        [...approvedPlaces].sort((a, b) => a.order - b.order).forEach((place, idx) => {
          text += `${idx + 1}. ${place.name}\n`;
          text += `   ${translate("address")}: ${place.address}\n`;
          if (place.googleMapsLink) text += `   ${translate("map")}: ${place.googleMapsLink}\n`;
        });
        text += `\n`;
      }

      if (approvedTransports.length > 0) {
        text += `${translate("transport").toUpperCase()}:\n`;
        approvedTransports.forEach((tr) => {
          const typeNames = { 
            plane: translate("transport_plane"), 
            train: translate("transport_train"), 
            bus: translate("transport_bus"), 
            car: translate("transport_car"), 
            ship: translate("transport_ship"), 
            other: translate("transport_other") 
          };
          text += `• ${typeNames[tr.type]}: ${tr.from} → ${tr.to}\n`;
          text += `  ${translate("departure_time")}: ${tr.departureTime} ${translate("from_preposition")} ${tr.departurePlace}\n`;
          if (tr.arrivalTime) text += `  ${translate("arrival_time")}: ${tr.arrivalTime} ${translate("in_preposition")} ${tr.arrivalPlace}\n`;
        });
        text += `\n`;
      }

      if (approvedAccommodations.length > 0) {
        text += `${translate("accommodation").toUpperCase()}:\n`;
        approvedAccommodations.forEach((acc) => {
          text += `• ${acc.name}\n`;
          text += `  ${translate("address")}: ${acc.address}\n`;
          text += `  ${translate("check_in")}: ${acc.checkIn} | ${translate("check_out")}: ${acc.checkOut}\n`;
          if (acc.bookingLink) text += `  ${translate("link")}: ${acc.bookingLink}\n`;
        });
        text += `\n`;
      }

      if (maxDay > 0) {
        text += `${translate("daily_plan").toUpperCase()}:\n\n`;
        for (let day = 1; day <= maxDay; day++) {
          const dayActivities = activitiesByDay[day] || [];
          if (dayActivities.length === 0) continue;
          
          text += `${translate("day").toUpperCase()} ${day}:\n`;
          dayActivities.sort((a, b) => a.time.localeCompare(b.time));
          dayActivities.forEach((activity) => {
            text += `  ${activity.time} - ${activity.name}\n`;
            text += `    ${translate("address")}: ${activity.address}\n`;
            if (activity.link) text += `    ${translate("link")}: ${activity.link}\n`;
            if (activity.description) text += `    ${activity.description}\n`;
          });
          text += `\n`;
        }
      }

      // Individual Plans in Summary
      if (Object.keys(activitiesByParticipant).length > 0) {
        text += `${translate("individual_plans").toUpperCase()}:\n\n`;
        tripUsers.forEach(user => {
          const userActs = activitiesByParticipant[user.id];
          if (userActs && userActs.length > 0) {
            text += `${user.name}:\n`;
            userActs.sort((a,b) => (a.day - b.day) || a.time.localeCompare(b.time)).forEach(a => {
              text += `  • [${translate("day")} ${a.day}] ${a.time} - ${a.name}\n`;
            });
            text += `\n`;
          }
        });
      }

      navigator.clipboard.writeText(text);
      alert(translate("link_copied"));
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6 pt-20">
        <div className="max-w-4xl mx-auto space-y-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => setView("plan")}
                className="text-lg"
              >
                ← Назад
              </Button>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Саммари поездки
              </h1>
            </div>
            <Button
              onClick={copySummary}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              📋 {translate("copy_summary")}
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-8 space-y-6">
                <div className="pb-4 border-b">
                  <h2 className="text-2xl font-bold mb-2">{activeTrip.name}</h2>
                  <div className="flex flex-wrap gap-2">
                    {tripUsers.map((u) => (
                      <span
                        key={u.id}
                        className="px-3 py-1 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full text-sm font-medium text-blue-700 flex items-center gap-1"
                      >
                        {u.name}
                        {u.id === activeTrip.createdBy && <span>👑</span>}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    Всего потрачено: <span className="font-bold">{getTotalExpenses().toFixed(2)} ₽</span>
                  </div>
                </div>

                {/* Places */}
                {approvedPlaces.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">📍 {translate("places")}</h3>
                    <div className="space-y-2">
                      {[...approvedPlaces].sort((a, b) => a.order - b.order).map((place) => (
                        <div key={place.id} className="p-3 bg-gray-50 rounded">
                          <div className="font-medium">{place.name}</div>
                          <div className="text-sm text-gray-600">{place.address}</div>
                          {place.googleMapsLink && (
                            <a
                              href={place.googleMapsLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 text-sm hover:underline"
                            >
                              🗺️ {translate("open_google_maps")}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Transport */}
                {approvedTransports.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">🚗 {translate("transport")}</h3>
                    <div className="space-y-2">
                      {approvedTransports.map((tr) => {
                        const typeIcons = { plane: "✈️", train: "🚂", bus: "🚌", car: "🚗", ship: "🚢", other: "🚛" };
                        return (
                          <div key={tr.id} className="p-3 bg-gray-50 rounded">
                            <div className="font-medium">{typeIcons[tr.type]} {tr.from} → {tr.to}</div>
                            <div className="text-sm text-gray-600">
                              {tr.departureTime} из {tr.departurePlace}
                              {tr.arrivalTime && ` → ${tr.arrivalTime} в ${tr.arrivalPlace}`}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Accommodations */}
                {approvedAccommodations.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">🏠 {translate("accommodation")}</h3>
                    <div className="space-y-2">
                      {approvedAccommodations.map((acc) => (
                        <div key={acc.id} className="p-3 bg-gray-50 rounded">
                          <div className="font-medium">{acc.name}</div>
                          <div className="text-sm text-gray-600">{acc.address}</div>
                          <div className="text-sm text-gray-600">
                            {acc.checkIn} - {acc.checkOut}
                          </div>
                          {acc.bookingLink && (
                            <a
                              href={acc.bookingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 text-sm hover:underline"
                            >
                              🔗 {translate("open_booking")}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Daily Plan */}
                {maxDay > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">📅 {translate("daily_plan")}</h3>
                    <div className="space-y-4">
                      {Array.from({ length: maxDay }, (_, i) => i + 1).map((day) => {
                        const dayActivities = activitiesByDay[day] || [];
                        if (dayActivities.length === 0) return null;
                        
                        dayActivities.sort((a: Activity, b: Activity) => a.time.localeCompare(b.time));
                        return (
                          <div key={day} className="border-l-4 border-blue-500 pl-4">
                            <h4 className="font-semibold text-lg mb-2">{translate("day")} {day}</h4>
                            <div className="space-y-3">
                              {dayActivities.map((activity: Activity) => (
                                <div key={activity.id} className="p-3 bg-green-50 rounded border border-green-200">
                                  <div className="font-medium flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    {activity.time} - {activity.name}
                                  </div>
                                  <div className="text-sm text-gray-600 mt-1">📍 {activity.address}</div>
                                  {activity.link && (
                                    <a
                                      href={activity.link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 text-sm hover:underline"
                                    >
                                      🔗 {translate("link")}
                                    </a>
                                  )}
                                  {activity.description && (
                                    <div className="text-sm text-gray-600 mt-1">{activity.description}</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Individual Plans */}
                {Object.keys(activitiesByParticipant).length > 0 && (
                  <div className="pt-6 border-t">
                    <h3 className="text-lg font-semibold mb-4">👤 {translate("activities_by_participant")}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {tripUsers.map((user) => {
                        const userActs = activitiesByParticipant[user.id];
                        if (!userActs || userActs.length === 0) return null;
                        
                        return (
                          <div key={user.id} className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                                {user.name[0].toUpperCase()}
                              </div>
                              <span className="font-semibold text-gray-800">{user.name}</span>
                            </div>
                            <div className="space-y-2">
                              {userActs.sort((a,b) => (a.day - b.day) || a.time.localeCompare(b.time)).map(a => (
                                <div key={a.id} className="text-sm flex gap-2">
                                  <span className="text-blue-500 font-medium whitespace-nowrap">д.{a.day} {a.time}</span>
                                  <span className="text-gray-700">{a.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  return null;
}
