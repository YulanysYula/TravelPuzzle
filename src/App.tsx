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
import { useEffect, useState } from "react";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [view, setView] = useState<"login" | "register" | "dashboard" | "plan" | "chat" | "summary">("login");
  const [messageInput, setMessageInput] = useState("");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [autoSaveStatus, setAutoSaveStatus] = useState<"saved" | "saving" | null>(null);
  const [tripUsers, setTripUsers] = useState<User[]>([]);
  // Language state - loaded before user check
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem("app_language");
    return (saved === "en" || saved === "ru") ? saved as Language : "ru";
  });
  
  // Translation helper
  const translate = (key: string): string => t(key, language);
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
  const [newPlace, setNewPlace] = useState({ name: "", address: "", imageUrl: "", googleMapsLink: "", status: "new" as "new" | "possible" | "rejected" | "approved" });
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [newActivity, setNewActivity] = useState({ name: "", description: "", imageUrl: "", link: "", address: "", day: 1, time: "", status: "new" as "new" | "possible" | "rejected" | "approved" });
  const [newAccommodation, setNewAccommodation] = useState({ name: "", address: "", imageUrl: "", bookingLink: "", description: "", checkIn: "", checkOut: "", price: "", status: "new" as "new" | "possible" | "rejected" | "approved" });
  const [newTransport, setNewTransport] = useState({ type: "plane" as "plane" | "train" | "bus" | "car" | "ship" | "other", from: "", to: "", departureTime: "", departurePlace: "", arrivalTime: "", arrivalPlace: "", passengers: 1, description: "", status: "new" as "new" | "possible" | "rejected" | "approved" });

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

  // Auto-save trip changes
  useEffect(() => {
    if (!activeTrip) return;
    
    const timer = setTimeout(async () => {
      if (activeTrip) {
        setAutoSaveStatus("saving");
        await saveTrip(activeTrip);
        setTrips(prev => prev.map(t => t.id === activeTrip.id ? activeTrip : t));
        setTimeout(() => {
          setAutoSaveStatus("saved");
          setTimeout(() => setAutoSaveStatus(null), 2000);
        }, 500);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [activeTrip]);

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
                saveTrip(st); // Update local storage (fire and forget)
              }
            } else {
              mergedTrips.push(st);
              saveTrip(st); // Update local storage (fire and forget)
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
    }, 3000);

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

  const handleRegister = (email: string, name: string, password: string) => {
    if (!email.trim() || !name.trim() || !password.trim()) {
      alert("Заполните все поля");
      return;
    }

    const checkAndRegister = async () => {
      if (await getUserByEmail(email)) {
        alert("Пользователь с таким email уже существует");
        return;
      }

      const newUser = await createUser(email, name, password);
      setCurrentUser(newUser);
      setUser(newUser);
      setView("dashboard");
      await loadTrips(newUser.id);
      // Clear form fields
      setEmail("");
      setName("");
      setPassword("");
    };
    checkAndRegister();
  };

  const handleLogin = async (email: string, password: string) => {
    const foundUser = await getUserByEmail(email);
    if (!foundUser || foundUser.password !== password) {
      alert(translate("invalid_credentials"));
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
    
    // Clear form fields
    setEmail("");
    setPassword("");
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
      currency: "RUB",
    };
    
    saveTrip(trip);
    setTrips([...trips, trip]);
    setActiveTrip(trip);
    setView("plan");
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
    if (!activeTrip || !editingItem?.name?.trim()) return;
    const updated: Trip = {
      ...activeTrip,
      name: editingItem.name.trim(),
      updatedAt: new Date(),
    };
    setActiveTrip(updated);
    saveTrip(updated);
    setEditTripNameDialogOpen(false);
    setEditingItem(null);
  };

  // Update place
  const updatePlace = () => {
    if (!activeTrip || !editingItem) return;
    const updated: Trip = {
      ...activeTrip,
      places: (activeTrip.places || []).map(p => 
        p.id === editingItem.id ? { ...p, ...newPlace } : p
      ),
      updatedAt: new Date(),
    };
    setActiveTrip(updated);
    saveTrip(updated);
    setEditPlaceDialogOpen(false);
    setEditingItem(null);
    setNewPlace({ name: "", address: "", imageUrl: "", googleMapsLink: "", status: "new" });
  };

  // Update activity
  const updateActivity = () => {
    if (!activeTrip || !editingItem) return;
    const updated: Trip = {
      ...activeTrip,
      activities: ((activeTrip.activities as unknown as Activity[]) || []).map(a => 
        a.id === editingItem.id ? { ...a, ...newActivity } : a
      ),
      updatedAt: new Date(),
    };
    setActiveTrip(updated);
    saveTrip(updated);
    setEditActivityDialogOpen(false);
    setEditingItem(null);
    setNewActivity({ name: "", description: "", imageUrl: "", link: "", address: "", day: 1, time: "", status: "new" });
  };

  // Update accommodation
  const updateAccommodation = () => {
    if (!activeTrip || !editingItem) return;
    const updated: Trip = {
      ...activeTrip,
      accommodations: (activeTrip.accommodations || []).map(acc => 
        acc.id === editingItem.id ? { ...acc, ...newAccommodation, price: parseFloat(newAccommodation.price) || 0 } : acc
      ),
      updatedAt: new Date(),
    };
    setActiveTrip(updated);
    saveTrip(updated);
    setEditAccommodationDialogOpen(false);
    setEditingItem(null);
    setNewAccommodation({ name: "", address: "", imageUrl: "", bookingLink: "", description: "", checkIn: "", checkOut: "", price: "", status: "new" });
  };

  // Update transport
  const updateTransport = () => {
    if (!activeTrip || !editingItem) return;
    const updated: Trip = {
      ...activeTrip,
      transports: (activeTrip.transports || []).map(tr => 
        tr.id === editingItem.id ? { ...tr, ...newTransport } : tr
      ),
      updatedAt: new Date(),
    };
    setActiveTrip(updated);
    saveTrip(updated);
    setEditTransportDialogOpen(false);
    setEditingItem(null);
    setNewTransport({ type: "plane", from: "", to: "", departureTime: "", departurePlace: "", arrivalTime: "", arrivalPlace: "", passengers: 1, description: "", status: "new" });
  };

  // Update expense
  const updateExpense = () => {
    if (!activeTrip || !editingItem) return;
    const amount = parseFloat(newExpense.amount);
    if (isNaN(amount) || amount <= 0) {
      alert(translate("enter_valid_amount"));
      return;
    }
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
  };

  // Update status for any card
  const updateCardStatus = (type: "place" | "activity" | "accommodation" | "transport", id: string, status: "new" | "possible" | "rejected" | "approved") => {
    if (!activeTrip) return;
    let updated: Trip = { ...activeTrip, updatedAt: new Date() };
    
    if (type === "place") {
      updated.places = (activeTrip.places || []).map(p => p.id === id ? { ...p, status } : p);
    } else if (type === "activity") {
      updated.activities = ((activeTrip.activities as unknown as Activity[]) || []).map(a => a.id === id ? { ...a, status } : a);
    } else if (type === "accommodation") {
      updated.accommodations = (activeTrip.accommodations || []).map(acc => acc.id === id ? { ...acc, status } : acc);
    } else if (type === "transport") {
      updated.transports = (activeTrip.transports || []).map(tr => tr.id === id ? { ...tr, status } : tr);
    }
    
    setActiveTrip(updated);
    saveTrip(updated);
  };

  // Handle trip cover image upload
  const handleTripCoverImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeTrip || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    const reader = new FileReader();
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
    if (!inviteEmail.trim() || !activeTrip || !user) return;

    const invitedUser = await getUserByEmail(inviteEmail);
    if (!invitedUser) {
      alert("Пользователь с таким email не найден");
      return;
    }

    if (activeTrip.users.includes(invitedUser.id)) {
      alert("Пользователь уже добавлен в поездку");
      setInviteEmail("");
      setInviteDialogOpen(false);
      return;
    }

    const updated: Trip = {
      ...activeTrip,
      users: [...activeTrip.users, invitedUser.id],
      updatedAt: new Date(),
    };

    setActiveTrip(updated);
    await saveTrip(updated);
    setInviteEmail("");
    setInviteDialogOpen(false);
    alert(`${invitedUser.name} ${translate("added_to_trip")}!`);
  };

  const removeUserFromTrip = (userId: string) => {
    if (!activeTrip || !user) return;
    if (activeTrip.createdBy === userId && user.id !== userId) {
      alert("Нельзя удалить создателя поездки");
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
                  Планировщик поездок
                </h1>
                <p className="text-gray-500">
                  {view === "login" ? "Войдите в свой аккаунт" : "Создайте новый аккаунт"}
                </p>
              </div>
              <div className="space-y-4">
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 text-lg"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && view === "login") {
                      handleLogin(email, password);
                    }
                  }}
                  autoFocus
                />
                {view === "register" && (
                  <Input
                    placeholder="Имя"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-12 text-lg"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleRegister(email, name, password);
                      }
                    }}
                  />
                )}
                <Input
                  type="password"
                  placeholder="Пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                  {view === "login" ? "Войти" : "Зарегистрироваться"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setView(view === "login" ? "register" : "login");
                    // Clear form when switching
                    setEmail("");
                    setName("");
                    setPassword("");
                  }}
                  className="w-full"
                >
                  {view === "login"
                    ? "Нет аккаунта? Зарегистрироваться"
                    : "Уже есть аккаунт? Войти"}
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
                + Создать первую поездку
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
                      style={trip.coverImage ? {
                        backgroundImage: `url(${trip.coverImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      } : {}}
                    >
                      {trip.coverImage && (
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                      )}
                      <CardContent className="p-6 space-y-4 relative z-10">
                        <div className="flex items-start justify-between">
                          <h2 className="text-xl font-bold text-gray-800">{trip.name}</h2>
                          <span className="text-2xl">✈️</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Прогресс</span>
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
                            Участников: {trip.users.length}
                          </p>
                          {trip.createdBy === user?.id && (
                            <p className="text-xs text-blue-500 mt-1">👑 Создатель</p>
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
                    <p className="text-gray-600 font-medium">Создать поездку</p>
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
    if (!activeTrip || !user || !newExpense.description.trim() || !newExpense.amount) return;
    
    const amount = parseFloat(newExpense.amount);
    if (isNaN(amount) || amount <= 0) {
      alert(language === "ru" ? "Введите корректную сумму" : "Enter a valid amount");
      return;
    }
    
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
    
    setActiveTrip(updated);
    saveTrip(updated);
    setNewExpense({ description: "", amount: "", category: "", sharedBy: [], currency: activeTrip.currency || "RUB" });
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
    if (!activeTrip || !user || !newPlace.name.trim()) return;
    
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
      createdAt: new Date(),
    };
    
    const updated: Trip = {
      ...activeTrip,
      places: [...(activeTrip.places || []), place],
      updatedAt: new Date(),
    };
    
    setActiveTrip(updated);
    saveTrip(updated);
    setNewPlace({ name: "", address: "", imageUrl: "", googleMapsLink: "", status: "new" });
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
    if (!activeTrip || !user || !newActivity.name.trim()) return;
    
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
      createdAt: new Date(),
    };
    
    const updated: Trip = {
      ...activeTrip,
      activities: [...((activeTrip.activities as unknown as Activity[]) || []), activity],
      updatedAt: new Date(),
    };
    
    setActiveTrip(updated);
    saveTrip(updated);
    setNewActivity({ name: "", description: "", imageUrl: "", link: "", address: "", day: 1, time: "", status: "new" });
    setActivityDialogOpen(false);
  };

  const handleActivityImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    if (file.size > 5 * 1024 * 1024) {
      alert(language === "ru" ? "Файл слишком большой (максимум 5MB)" : "File too large (max 5MB)");
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => {
      alert(language === "ru" ? "Ошибка при загрузке изображения" : "Error loading image");
    };
    reader.onloadend = () => {
      if (reader.result) {
        setNewActivity({ ...newActivity, imageUrl: reader.result as string });
      }
    };
    reader.readAsDataURL(file);
  };

  // Accommodation management
  const addAccommodation = () => {
    if (!activeTrip || !user || !newAccommodation.name.trim()) return;
    
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
      createdAt: new Date(),
    };
    
    const updated: Trip = {
      ...activeTrip,
      accommodations: [...(activeTrip.accommodations || []), accommodation],
      updatedAt: new Date(),
    };
    
    setActiveTrip(updated);
    saveTrip(updated);
    setNewAccommodation({ name: "", address: "", imageUrl: "", bookingLink: "", description: "", checkIn: "", checkOut: "", price: "", status: "new" });
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
    if (!activeTrip || !user || !newTransport.from.trim() || !newTransport.to.trim()) return;
    
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
      status: newTransport.status || "new",
      createdAt: new Date(),
    };
    
    const updated: Trip = {
      ...activeTrip,
      transports: [...(activeTrip.transports || []), transport],
      updatedAt: new Date(),
    };
    
    setActiveTrip(updated);
    saveTrip(updated);
    setNewTransport({ type: "plane", from: "", to: "", departureTime: "", departurePlace: "", arrivalTime: "", arrivalPlace: "", passengers: 1, description: "", status: "new" });
    setTransportDialogOpen(false);
  };

  if (view === "plan" && activeTrip && user) {
    // tripUsers is already fetched in useEffect

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
                onClick={() => setView("dashboard")}
                className="text-lg"
              >
                ← Назад
              </Button>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mt-4">
                {activeTrip && isTripPast(activeTrip) 
                  ? (language === "ru" ? "Информация о поездке" : "Trip Information")
                  : (language === "ru" ? "Планирование поездки" : "Trip Planning")
                }
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {autoSaveStatus === "saving" && (
                <span className="text-sm text-gray-500">💾 Сохранение...</span>
              )}
              {autoSaveStatus === "saved" && (
                <span className="text-sm text-green-500">✓ Сохранено</span>
              )}
            </div>
          </motion.div>

          {/* Trip Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card 
              className="shadow-2xl border-0 bg-gradient-to-br from-white via-blue-50/50 to-purple-50/50 backdrop-blur-sm relative overflow-hidden"
              style={activeTrip.coverImage ? {
                backgroundImage: `url(${activeTrip.coverImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              } : {}}
            >
              {activeTrip.coverImage && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
              )}
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
                      {language === "ru" ? "Обновлено" : "Updated"}: {new Date(activeTrip.updatedAt).toLocaleString(language === "ru" ? "ru-RU" : "en-US")}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {/* Trip cover image upload */}
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleTripCoverImageUpload}
                      />
                      <Button variant="outline" size="sm" className="w-full">
                        📷 {translate("cover")}
                      </Button>
                    </label>
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
                    + {language === "ru" ? "Пригласить" : "Invite"}
                  </Button>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                    👥 Участники поездки
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
                    📍 Места назначения
                  </h2>
                  <Button
                    onClick={() => setPlaceDialogOpen(true)}
                    variant="outline"
                    size="sm"
                    className="border-blue-300 text-blue-600 hover:bg-blue-50"
                  >
                    + Добавить место
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
                          <div className="font-semibold text-lg text-gray-800">{place.name}</div>
                          <div className="text-sm text-gray-600 mt-1">{place.address}</div>
                          {place.googleMapsLink && (
                            <a
                              href={place.googleMapsLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 text-sm hover:underline mt-1 inline-block font-medium"
                            >
                              🗺️ Открыть в Google Maps
                            </a>
                          )}
                        </div>
                        <div className="text-sm font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded-full">#{place.order}</div>
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
                            });
                            setEditPlaceDialogOpen(true);
                          }}
                          variant="outline"
                          size="sm"
                          className="border-blue-300 text-blue-600 hover:bg-blue-50"
                        >
                          ✏️ {translate("edit")}
                        </Button>
                        <Button
                          onClick={() => {
                            const updated = {
                              ...activeTrip,
                              places: (activeTrip.places || []).filter(p => p.id !== place.id),
                              updatedAt: new Date(),
                            };
                            setActiveTrip(updated);
                            saveTrip(updated);
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
                            ↑ Вверх
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
                            ↓ Вниз
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {(activeTrip.places || []).length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      <div className="text-4xl mb-2">📍</div>
                      <p className="text-sm">Нет добавленных мест</p>
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
                    💰 Бюджет и расходы
                  </h2>
                  <Button
                    onClick={() => setExpenseDialogOpen(true)}
                    variant="outline"
                    size="sm"
                    className="border-green-300 text-green-600 hover:bg-green-50"
                  >
                    + Добавить расход
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
                          Итого по категории: {expenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2)} ₽
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Debts */}
                <div className="pt-4 border-t border-green-200">
                  <h3 className="font-semibold mb-3 text-gray-700">Долги участников:</h3>
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
                            {debt > 0 ? `Должен: ${debt.toFixed(2)} ₽` : debt < 0 ? `Должны: ${Math.abs(debt).toFixed(2)} ₽` : "Баланс"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 pt-4 border-t border-green-200 font-bold text-lg text-green-700 bg-green-50 p-3 rounded-lg">
                    Всего потрачено: {getTotalExpenses().toFixed(2)} ₽
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
                    🎯 Активности
                  </h2>
                  <Button
                    onClick={() => setActivityDialogOpen(true)}
                    variant="outline"
                    size="sm"
                    className="border-orange-300 text-orange-600 hover:bg-orange-50"
                  >
                    + Добавить активность
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
                              <span className="text-green-600 text-xs bg-green-100 px-2 py-0.5 rounded-full font-bold">✓ Утверждено</span>
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
                                🔗 Ссылка
                              </a>
                            )}
                            <div className="text-sm font-medium mt-2 bg-white px-3 py-1 rounded-full inline-block text-orange-700">
                              📅 День {activity.day} в {activity.time}
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
                              <div className="font-semibold text-gray-800">{activity.name}</div>
                              <div className="text-sm text-gray-600 mt-1">{activity.description}</div>
                              <div className="text-sm text-gray-500 mt-1">📍 {activity.address}</div>
                              {activity.link && (
                                <a
                                  href={activity.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 text-sm hover:underline mt-1 inline-block font-medium"
                                >
                                  🔗 Ссылка
                                </a>
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
                              {hasVoted ? "✓ Голос отдан" : "Голосовать"} ({voteCount})
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
                                });
                                setEditActivityDialogOpen(true);
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
                                const updated = {
                                  ...activeTrip,
                                  activities: ((activeTrip.activities as unknown as Activity[]) || []).filter((a: Activity) => a.id !== activity.id),
                                  updatedAt: new Date(),
                                };
                                setActiveTrip(updated);
                                await saveTrip(updated);
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
                      <p className="text-sm">Нет добавленных активностей</p>
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
                    🏠 Жильё
                  </h2>
                  <Button
                    onClick={() => setAccommodationDialogOpen(true)}
                    variant="outline"
                    size="sm"
                    className="border-purple-300 text-purple-600 hover:bg-purple-50"
                  >
                    + Добавить жильё
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
                          <div className="font-semibold text-lg text-gray-800">{acc.name}</div>
                          <div className="text-sm text-gray-600 mt-1">📍 {acc.address}</div>
                          <div className="text-sm text-gray-500 mt-1">{acc.description}</div>
                          <div className="text-sm mt-2 bg-purple-50 px-3 py-1 rounded-full inline-block">
                            <span className="font-medium text-purple-700">Заезд:</span> {acc.checkIn} | <span className="font-medium text-purple-700">Выезд:</span> {acc.checkOut}
                          </div>
                          {acc.price > 0 && (
                            <div className="text-sm font-semibold text-green-600 mt-2">
                              Цена: {acc.price.toFixed(2)} ₽
                            </div>
                          )}
                          {acc.bookingLink && (
                            <a
                              href={acc.bookingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 text-sm hover:underline mt-2 inline-block font-medium"
                            >
                              🔗 Открыть на Booking.com
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
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
                            });
                            setEditAccommodationDialogOpen(true);
                          }}
                          variant="outline"
                          size="sm"
                          className="border-blue-300 text-blue-600 hover:bg-blue-50"
                        >
                          ✏️ {translate("edit")}
                        </Button>
                        <Button
                          onClick={() => {
                            const updated = {
                              ...activeTrip,
                              accommodations: (activeTrip.accommodations || []).filter(a => a.id !== acc.id),
                              updatedAt: new Date(),
                            };
                            setActiveTrip(updated);
                            saveTrip(updated);
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
                    🚗 Транспорт
                  </h2>
                  <Button
                    onClick={() => setTransportDialogOpen(true)}
                    variant="outline"
                    size="sm"
                    className="border-indigo-300 text-indigo-600 hover:bg-indigo-50"
                  >
                    + Добавить транспорт
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
                            <div className="font-semibold text-lg capitalize text-gray-800">{tr.type}</div>
                            <div className="text-sm text-gray-600 mt-1 font-medium">
                              {tr.from} → {tr.to}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              Отправление: {tr.departureTime} из {tr.departurePlace}
                            </div>
                            {tr.arrivalTime && (
                              <div className="text-sm text-gray-500">
                                Прибытие: {tr.arrivalTime} в {tr.arrivalPlace}
                              </div>
                            )}
                            <div className="text-sm text-gray-500 mt-1">
                              Пассажиров: {tr.passengers}
                            </div>
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
                                status: (tr.status || "new") as "new" | "possible" | "rejected" | "approved",
                              });
                              setEditTransportDialogOpen(true);
                            }}
                            variant="outline"
                            size="sm"
                            className="border-blue-300 text-blue-600 hover:bg-blue-50"
                          >
                            ✏️ {translate("edit")}
                          </Button>
                          <Button
                            onClick={() => {
                              const updated = {
                                ...activeTrip,
                                transports: (activeTrip.transports || []).filter(t => t.id !== tr.id),
                                updatedAt: new Date(),
                              };
                              setActiveTrip(updated);
                              saveTrip(updated);
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

          {/* Progress Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="shadow-2xl border-0 bg-gradient-to-br from-white via-blue-50/50 to-purple-50/50 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">Общий прогресс</span>
                  <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{activeTrip.progress}%</span>
                </div>
                <Progress value={activeTrip.progress} className="h-4" />
              </CardContent>
            </Card>
          </motion.div>


          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex gap-4 justify-center"
          >
            <Button
              onClick={() => setView("chat")}
              variant="outline"
              className="flex-1 max-w-xs h-12 text-lg"
            >
              💬 Чат
            </Button>
            <Button
              onClick={() => setView("summary")}
              className="flex-1 max-w-xs h-12 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              📋 Саммари
            </Button>
          </motion.div>

          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Пригласить участника</DialogTitle>
                <DialogDescription>
                  Введите email пользователя, которого хотите пригласить в поездку
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  type="email"
                  placeholder="Email участника"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="h-12"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      inviteUserToTrip();
                    }
                  }}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                  Отмена
                </Button>
                <Button
                  onClick={inviteUserToTrip}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  Пригласить
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Expense Dialog */}
          <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Добавить расход</DialogTitle>
                <DialogDescription>
                  Внесите информацию о расходе и выберите, кто его оплатил и с кем делится
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Описание расхода"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  className="h-12"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    placeholder={translate("amount")}
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                    className="h-12"
                  />
                  <select
                    value={newExpense.currency || activeTrip?.currency || "RUB"}
                    onChange={(e) => setNewExpense({ ...newExpense, currency: e.target.value })}
                    className="h-12 px-3 border rounded-md"
                  >
                    <option value="RUB">₽ RUB</option>
                    <option value="USD">$ USD</option>
                    <option value="EUR">€ EUR</option>
                    <option value="GBP">£ GBP</option>
                  </select>
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
                    Распределить между (оставьте пустым для всех):
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
                  Отмена
                </Button>
                <Button
                  onClick={addExpense}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  Добавить
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Place Dialog */}
          <Dialog open={placeDialogOpen} onOpenChange={setPlaceDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{placeDialogOpen && !editingItem ? translate("add_place") : translate("edit")}</DialogTitle>
                <DialogDescription>
                  {placeDialogOpen && !editingItem ? translate("add_place") : translate("edit")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder={translate("place_name")}
                  value={newPlace.name}
                  onChange={(e) => setNewPlace({ ...newPlace, name: e.target.value })}
                  className="h-12"
                />
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
                    {language === "ru" ? "Статус" : "Status"}
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
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePlaceImageUpload}
                  />
                  <Button variant="outline" className="w-full">
                    {newPlace.imageUrl ? translate("image_uploaded") : translate("upload_image")}
                  </Button>
                </label>
                {newPlace.imageUrl && (
                  <img src={newPlace.imageUrl} alt="Preview" className="w-full h-32 object-cover rounded" />
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPlaceDialogOpen(false)}>
                  Отмена
                </Button>
                <Button
                  onClick={addPlace}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  Добавить
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Activity Dialog */}
          <Dialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Добавить активность</DialogTitle>
                <DialogDescription>
                  Добавьте активность с описанием, картинкой и ссылкой
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Название активности"
                  value={newActivity.name}
                  onChange={(e) => setNewActivity({ ...newActivity, name: e.target.value })}
                  className="h-12"
                />
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
                    placeholder="День путешествия"
                    value={newActivity.day}
                    onChange={(e) => setNewActivity({ ...newActivity, day: parseInt(e.target.value) || 1 })}
                    className="h-12"
                  />
                  <Input
                    placeholder="Время (например: 10:00)"
                    value={newActivity.time}
                    onChange={(e) => setNewActivity({ ...newActivity, time: e.target.value })}
                    className="h-12"
                  />
                </div>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleActivityImageUpload}
                  />
                  <Button variant="outline" className="w-full">
                    {newActivity.imageUrl ? translate("image_uploaded") : translate("upload_image")}
                  </Button>
                </label>
                {newActivity.imageUrl && (
                  <img src={newActivity.imageUrl} alt="Preview" className="w-full h-32 object-cover rounded" />
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setActivityDialogOpen(false)}>
                  Отмена
                </Button>
                <Button
                  onClick={addActivity}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  Добавить
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Accommodation Dialog */}
          <Dialog open={accommodationDialogOpen} onOpenChange={setAccommodationDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{accommodationDialogOpen && !editingItem ? translate("add_accommodation") : translate("edit")}</DialogTitle>
                <DialogDescription>
                  {accommodationDialogOpen && !editingItem ? translate("add_accommodation") : translate("edit")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Название отеля/жилья"
                  value={newAccommodation.name}
                  onChange={(e) => setNewAccommodation({ ...newAccommodation, name: e.target.value })}
                  className="h-12"
                />
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
                    placeholder="Дата заезда"
                    value={newAccommodation.checkIn}
                    onChange={(e) => setNewAccommodation({ ...newAccommodation, checkIn: e.target.value })}
                    className="h-12"
                  />
                  <Input
                    type="date"
                    placeholder="Дата выезда"
                    value={newAccommodation.checkOut}
                    onChange={(e) => setNewAccommodation({ ...newAccommodation, checkOut: e.target.value })}
                    className="h-12"
                  />
                </div>
                <Input
                  type="number"
                  placeholder="Цена (₽)"
                  value={newAccommodation.price}
                  onChange={(e) => setNewAccommodation({ ...newAccommodation, price: e.target.value })}
                  className="h-12"
                />
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAccommodationImageUpload}
                  />
                  <Button variant="outline" className="w-full">
                    {newAccommodation.imageUrl ? translate("image_uploaded") : translate("upload_image")}
                  </Button>
                </label>
                {newAccommodation.imageUrl && (
                  <img src={newAccommodation.imageUrl} alt="Preview" className="w-full h-32 object-cover rounded" />
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAccommodationDialogOpen(false)}>
                  Отмена
                </Button>
                <Button
                  onClick={addAccommodation}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  Добавить
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Transport Dialog */}
          <Dialog open={transportDialogOpen} onOpenChange={setTransportDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Добавить транспорт</DialogTitle>
                <DialogDescription>
                  Добавьте информацию о транспорте
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <select
                  value={newTransport.type}
                  onChange={(e) => setNewTransport({ ...newTransport, type: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-md h-12"
                >
                  <option value="plane">✈️ Самолет</option>
                  <option value="train">🚂 Поезд</option>
                  <option value="bus">🚌 Автобус</option>
                  <option value="car">🚗 Автомобиль</option>
                  <option value="ship">🚢 Корабль</option>
                  <option value="other">🚛 Другое</option>
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Откуда"
                    value={newTransport.from}
                    onChange={(e) => setNewTransport({ ...newTransport, from: e.target.value })}
                    className="h-12"
                  />
                  <Input
                    placeholder="Куда"
                    value={newTransport.to}
                    onChange={(e) => setNewTransport({ ...newTransport, to: e.target.value })}
                    className="h-12"
                  />
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
                <Input
                  type="number"
                  placeholder="Количество пассажиров"
                  value={newTransport.passengers}
                  onChange={(e) => setNewTransport({ ...newTransport, passengers: parseInt(e.target.value) || 1 })}
                  className="h-12"
                />
                <Textarea
                  placeholder="Описание"
                  value={newTransport.description}
                  onChange={(e) => setNewTransport({ ...newTransport, description: e.target.value })}
                  className="min-h-[80px]"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setTransportDialogOpen(false)}>
                  Отмена
                </Button>
                <Button
                  onClick={addTransport}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  Добавить
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
          <Dialog open={editTripNameDialogOpen} onOpenChange={setEditTripNameDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{translate("edit")} {translate("name")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder={translate("name")}
                  value={editingItem?.name || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="h-12"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      updateTripName();
                    }
                  }}
                />
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

          {/* Edit Activity Dialog */}
          <Dialog open={editActivityDialogOpen} onOpenChange={setEditActivityDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{translate("edit")} {translate("activity_name")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder={translate("activity_name")}
                  value={newActivity.name}
                  onChange={(e) => setNewActivity({ ...newActivity, name: e.target.value })}
                  className="h-12"
                />
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
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleActivityImageUpload}
                  />
                  <Button variant="outline" className="w-full">
                    {newActivity.imageUrl ? translate("image_uploaded") : translate("upload_image")}
                  </Button>
                </label>
                {newActivity.imageUrl && (
                  <img src={newActivity.imageUrl} alt="Preview" className="w-full h-32 object-cover rounded" />
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setEditActivityDialogOpen(false);
                  setEditingItem(null);
                  setNewActivity({ name: "", description: "", imageUrl: "", link: "", address: "", day: 1, time: "", status: "new" });
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
          <Dialog open={editAccommodationDialogOpen} onOpenChange={setEditAccommodationDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{translate("edit")} {translate("accommodation")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder={translate("hotel_name")}
                  value={newAccommodation.name}
                  onChange={(e) => setNewAccommodation({ ...newAccommodation, name: e.target.value })}
                  className="h-12"
                />
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
                <Input
                  type="number"
                  placeholder={translate("price")}
                  value={newAccommodation.price}
                  onChange={(e) => setNewAccommodation({ ...newAccommodation, price: e.target.value })}
                  className="h-12"
                />
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAccommodationImageUpload}
                  />
                  <Button variant="outline" className="w-full">
                    {newAccommodation.imageUrl ? translate("image_uploaded") : translate("upload_image")}
                  </Button>
                </label>
                {newAccommodation.imageUrl && (
                  <img src={newAccommodation.imageUrl} alt="Preview" className="w-full h-32 object-cover rounded" />
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setEditAccommodationDialogOpen(false);
                  setEditingItem(null);
                  setNewAccommodation({ name: "", address: "", imageUrl: "", bookingLink: "", description: "", checkIn: "", checkOut: "", price: "", status: "new" });
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
          <Dialog open={editTransportDialogOpen} onOpenChange={setEditTransportDialogOpen}>
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
                  <option value="plane">✈️ {translate("transport")}</option>
                  <option value="train">🚂 {translate("transport")}</option>
                  <option value="bus">🚌 {translate("transport")}</option>
                  <option value="car">🚗 {translate("transport")}</option>
                  <option value="ship">🚢 {translate("transport")}</option>
                  <option value="other">🚛 {translate("category_other")}</option>
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder={translate("from")}
                    value={newTransport.from}
                    onChange={(e) => setNewTransport({ ...newTransport, from: e.target.value })}
                    className="h-12"
                  />
                  <Input
                    placeholder={translate("to")}
                    value={newTransport.to}
                    onChange={(e) => setNewTransport({ ...newTransport, to: e.target.value })}
                    className="h-12"
                  />
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
                <Input
                  type="number"
                  placeholder={translate("passengers")}
                  value={newTransport.passengers}
                  onChange={(e) => setNewTransport({ ...newTransport, passengers: parseInt(e.target.value) || 1 })}
                  className="h-12"
                />
                <Textarea
                  placeholder={translate("description")}
                  value={newTransport.description}
                  onChange={(e) => setNewTransport({ ...newTransport, description: e.target.value })}
                  className="min-h-[80px]"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setEditTransportDialogOpen(false);
                  setEditingItem(null);
                  setNewTransport({ type: "plane", from: "", to: "", departureTime: "", departurePlace: "", arrivalTime: "", arrivalPlace: "", passengers: 1, description: "", status: "new" });
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
          <Dialog open={editExpenseDialogOpen} onOpenChange={setEditExpenseDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{translate("edit")} {translate("expense_description")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder={translate("expense_description")}
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  className="h-12"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    placeholder={translate("amount")}
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                    className="h-12"
                  />
                  <select
                    value={newExpense.currency || activeTrip?.currency || "RUB"}
                    onChange={(e) => setNewExpense({ ...newExpense, currency: e.target.value })}
                    className="h-12 px-3 border rounded-md"
                  >
                    <option value="RUB">₽ RUB</option>
                    <option value="USD">$ USD</option>
                    <option value="EUR">€ EUR</option>
                    <option value="GBP">£ GBP</option>
                  </select>
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
                    {translate("participants")} ({translate("cancel")} для всех):
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
                    placeholder="Напишите сообщение..."
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
                    Отправить
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
    
    // Group activities by day
    const activitiesArray = (activeTrip.activities as unknown as Activity[]) || [];
    const activitiesByDay = [...activitiesArray]
      .filter((a: Activity) => a.approved)
      .reduce((acc, activity: Activity) => {
        const day = activity.day || 1;
        if (!acc[day]) acc[day] = [];
        acc[day].push(activity);
        return acc;
      }, {} as Record<number, Activity[]>);

    const maxDay = Math.max(0, ...Object.keys(activitiesByDay).map(Number));

    const copySummary = () => {
      let text = `ПЛАН ПУТЕШЕСТВИЯ: ${activeTrip.name}\n\n`;
      text += `Участники: ${tripUsers.map(u => u.name).join(", ")}\n`;
      text += `Всего потрачено: ${getTotalExpenses().toFixed(2)} ₽\n\n`;
      
      if ((activeTrip.places || []).length > 0) {
        text += `МЕСТА НАЗНАЧЕНИЯ:\n`;
        [...(activeTrip.places || [])].sort((a, b) => a.order - b.order).forEach((place, idx) => {
          text += `${idx + 1}. ${place.name}\n`;
          text += `   Адрес: ${place.address}\n`;
          if (place.googleMapsLink) text += `   Карта: ${place.googleMapsLink}\n`;
        });
        text += `\n`;
      }

      if ((activeTrip.transports || []).length > 0) {
        text += `ТРАНСПОРТ:\n`;
        (activeTrip.transports || []).forEach((tr) => {
          const typeNames = { plane: "Самолет", train: "Поезд", bus: "Автобус", car: "Автомобиль", ship: "Корабль", other: "Другое" };
          text += `• ${typeNames[tr.type]}: ${tr.from} → ${tr.to}\n`;
          text += `  Отправление: ${tr.departureTime} из ${tr.departurePlace}\n`;
          if (tr.arrivalTime) text += `  Прибытие: ${tr.arrivalTime} в ${tr.arrivalPlace}\n`;
        });
        text += `\n`;
      }

      if ((activeTrip.accommodations || []).length > 0) {
        text += `ЖИЛЬЁ:\n`;
        (activeTrip.accommodations || []).forEach((acc) => {
          text += `• ${acc.name}\n`;
          text += `  Адрес: ${acc.address}\n`;
          text += `  Заезд: ${acc.checkIn} | Выезд: ${acc.checkOut}\n`;
          if (acc.bookingLink) text += `  Ссылка: ${acc.bookingLink}\n`;
        });
        text += `\n`;
      }

      if (maxDay > 0) {
        text += `ПЛАН ПО ДНЯМ:\n\n`;
        for (let day = 1; day <= maxDay; day++) {
          text += `ДЕНЬ ${day}:\n`;
          const dayActivities = activitiesByDay[day] || [];
          dayActivities.sort((a, b) => a.time.localeCompare(b.time));
          dayActivities.forEach((activity) => {
            text += `  ${activity.time} - ${activity.name}\n`;
            text += `    Адрес: ${activity.address}\n`;
            if (activity.link) text += `    Ссылка: ${activity.link}\n`;
            if (activity.description) text += `    ${activity.description}\n`;
          });
          text += `\n`;
        }
      }

      navigator.clipboard.writeText(text);
      alert("Саммари скопировано в буфер обмена!");
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
              📋 Копировать
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
                {(activeTrip.places || []).length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">📍 Места назначения</h3>
                    <div className="space-y-2">
                      {[...(activeTrip.places || [])].sort((a, b) => a.order - b.order).map((place) => (
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
                              🗺️ Открыть в Google Maps
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Transport */}
                {(activeTrip.transports || []).length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">🚗 Транспорт</h3>
                    <div className="space-y-2">
                      {(activeTrip.transports || []).map((tr) => {
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
                {(activeTrip.accommodations || []).length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">🏠 Жильё</h3>
                    <div className="space-y-2">
                      {(activeTrip.accommodations || []).map((acc) => (
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
                              🔗 Открыть на Booking.com
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
                    <h3 className="text-lg font-semibold mb-3">📅 План по дням</h3>
                    <div className="space-y-4">
                      {Array.from({ length: maxDay }, (_, i) => i + 1).map((day) => {
                        const dayActivities = activitiesByDay[day] || [];
                        dayActivities.sort((a: Activity, b: Activity) => a.time.localeCompare(b.time));
                        return (
                          <div key={day} className="border-l-4 border-blue-500 pl-4">
                            <h4 className="font-semibold text-lg mb-2">День {day}</h4>
                            {dayActivities.length === 0 ? (
                              <p className="text-gray-400 text-sm">Нет запланированных активностей</p>
                            ) : (
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
                                        🔗 Ссылка
                                      </a>
                                    )}
                                    {activity.description && (
                                      <div className="text-sm text-gray-600 mt-1">{activity.description}</div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
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
