export type Language = "ru" | "en";

export const translations: Record<string, Record<Language, string>> = {
  // Authentication
  "login": { ru: "Вход", en: "Login" },
  "register": { ru: "Регистрация", en: "Register" },
  "email": { ru: "Email", en: "Email" },
  "password": { ru: "Пароль", en: "Password" },
  "name": { ru: "Имя", en: "Name" },
  "enter": { ru: "Войти", en: "Enter" },
  "create_account": { ru: "Создать аккаунт", en: "Create Account" },
  "already_have_account": { ru: "Уже есть аккаунт?", en: "Already have an account?" },
  "no_account": { ru: "Нет аккаунта?", en: "No account?" },
  "invalid_credentials": { ru: "Неверный email или пароль", en: "Invalid email or password" },
  "user_exists": { ru: "Пользователь с таким email уже существует", en: "User with this email already exists" },
  "user_not_found": { ru: "Пользователь с таким email не найден", en: "User with this email not found" },
  "user_already_added": { ru: "Пользователь уже добавлен в поездку", en: "User already added to trip" },
  "added_to_trip": { ru: "добавлен в поездку", en: "added to trip" },
  "fill_all_fields": { ru: "Заполните все поля", en: "Fill all fields" },
  "trip_planner": { ru: "Планировщик поездок", en: "Trip Planner" },
  "login_to_account": { ru: "Войдите в свой аккаунт", en: "Login to your account" },
  "create_new_account": { ru: "Создайте новый аккаунт", en: "Create a new account" },

  
  // Dashboard
  "my_trips": { ru: "Мои поездки", en: "My Trips" },
  "create_trip": { ru: "Создать поездку", en: "Create Trip" },
  "new_trip": { ru: "Новая поездка", en: "New Trip" },
  "no_trips": { ru: "У вас пока нет поездок", en: "You don't have any trips yet" },
  "create_first_trip": { ru: "Создайте первую поездку, чтобы начать планирование", en: "Create your first trip to start planning" },
  "progress": { ru: "Прогресс", en: "Progress" },
  "back": { ru: "Назад", en: "Back" },
  "logout": { ru: "Выйти", en: "Logout" },
  
  // Trip Planning
  "trip_planning": { ru: "Планирование поездки", en: "Trip Planning" },
  "trip_information": { ru: "Информация о поездке", en: "Trip Information" },
  "updated": { ru: "Обновлено", en: "Updated" },
  "participants": { ru: "Участники поездки", en: "Trip Participants" },
  "invite": { ru: "Пригласить", en: "Invite" },
  "share": { ru: "Поделиться", en: "Share" },
  "cover": { ru: "Обложка", en: "Cover" },
  "edit": { ru: "Редактировать", en: "Edit" },
  "delete": { ru: "Удалить", en: "Delete" },
  "save": { ru: "Сохранить", en: "Save" },
  "cancel": { ru: "Отмена", en: "Cancel" },
  "saving": { ru: "Сохранение...", en: "Saving..." },
  "saved": { ru: "Сохранено", en: "Saved" },
  
  // Places
  "places": { ru: "Места назначения", en: "Destinations" },
  "add_place": { ru: "Добавить место", en: "Add Place" },
  "place_name": { ru: "Название места", en: "Place Name" },
  "address": { ru: "Адрес", en: "Address" },
  "google_maps_link": { ru: "Ссылка Google Maps", en: "Google Maps Link" },
  "open_google_maps": { ru: "Открыть в Google Maps", en: "Open in Google Maps" },
  "no_places": { ru: "Нет добавленных мест", en: "No places added" },
  
  // Activities
  "activities": { ru: "Активности", en: "Activities" },
  "add_activity": { ru: "Добавить активность", en: "Add Activity" },
  "activity_name": { ru: "Название активности", en: "Activity Name" },
  "description": { ru: "Описание", en: "Description" },
  "link": { ru: "Ссылка", en: "Link" },
  "day": { ru: "День", en: "Day" },
  "time": { ru: "Время", en: "Time" },
  "vote": { ru: "Голосовать", en: "Vote" },
  "voted": { ru: "✓ Голос отдан", en: "✓ Voted" },
  "approve": { ru: "Утвердить", en: "Approve" },
  "approved": { ru: "✓ Утверждено", en: "✓ Approved" },
  "no_activities": { ru: "Нет добавленных активностей", en: "No activities added" },
  
  // Accommodation
  "accommodation": { ru: "Жильё", en: "Accommodation" },
  "add_accommodation": { ru: "Добавить жильё", en: "Add Accommodation" },
  "hotel_name": { ru: "Название отеля/жилья", en: "Hotel/Accommodation Name" },
  "booking_link": { ru: "Ссылка на Booking.com", en: "Booking.com Link" },
  "check_in": { ru: "Дата заезда", en: "Check-in Date" },
  "check_out": { ru: "Дата выезда", en: "Check-out Date" },
  "price": { ru: "Цена", en: "Price" },
  "cost": { ru: "Стоимость", en: "Cost" },
  "open_booking": { ru: "Открыть на Booking.com", en: "Open on Booking.com" },
  "no_accommodation": { ru: "Нет добавленного жилья", en: "No accommodation added" },
  
  // Transport
  "transport": { ru: "Транспорт", en: "Transport" },
  "add_transport": { ru: "Добавить транспорт", en: "Add Transport" },
  "from": { ru: "Откуда", en: "From" },
  "to": { ru: "Куда", en: "To" },
  "departure_time": { ru: "Время отправления", en: "Departure Time" },
  "departure_place": { ru: "Место отправления", en: "Departure Place" },
  "arrival_time": { ru: "Время прибытия", en: "Arrival Time" },
  "arrival_place": { ru: "Место прибытия", en: "Arrival Place" },
  "passengers": { ru: "Пассажиров", en: "Passengers" },
  "no_transport": { ru: "Нет добавленного транспорта", en: "No transport added" },
  
  // Budget
  "budget_expenses": { ru: "Бюджет и расходы", en: "Budget and Expenses" },
  "add_expense": { ru: "Добавить расход", en: "Add Expense" },
  "expense_description": { ru: "Описание расхода", en: "Expense Description" },
  "amount": { ru: "Сумма", en: "Amount" },
  "category": { ru: "Категория", en: "Category" },
  "currency": { ru: "Валюта", en: "Currency" },
  "total_spent": { ru: "Всего потрачено", en: "Total Spent" },
  "debts": { ru: "Долги участников", en: "Participant Debts" },
  "balance": { ru: "Баланс", en: "Balance" },
  "owes": { ru: "Должен", en: "Owes" },
  "owed": { ru: "Должны", en: "Owed" },
  "no_expenses": { ru: "Нет добавленных расходов", en: "No expenses added" },
  
  // Expense Categories
  "category_transport": { ru: "Транспорт", en: "Transport" },
  "category_accommodation": { ru: "Проживание", en: "Accommodation" },
  "category_food": { ru: "Питание", en: "Food" },
  "category_shopping": { ru: "Шопинг", en: "Shopping" },
  "category_entertainment": { ru: "Развлечения", en: "Entertainment" },
  "category_cafe": { ru: "Кафе/Рестораны", en: "Café/Restaurants" },
  "category_other": { ru: "Прочее", en: "Other" },
  
  // Status
  "status": { ru: "Статус", en: "Status" },
  "status_new": { ru: "Новое", en: "New" },
  "status_possible": { ru: "Возможно", en: "Possible" },
  "status_rejected": { ru: "Отклонено", en: "Rejected" },
  "status_approved": { ru: "Утверждено", en: "Approved" },
  
  // Common
  "up": { ru: "↑ Вверх", en: "↑ Up" },
  "down": { ru: "↓ Вниз", en: "↓ Down" },
  "order": { ru: "Порядок", en: "Order" },
  "upload_image": { ru: "Загрузить изображение", en: "Upload Image" },
  "image_uploaded": { ru: "✓ Изображение загружено", en: "✓ Image Uploaded" },
  "file_too_large": { ru: "Файл слишком большой (максимум 5MB)", en: "File too large (max 5MB)" },
  "error_loading_image": { ru: "Ошибка при загрузке изображения", en: "Error loading image" },
  "enter_valid_amount": { ru: "Введите корректную сумму", en: "Enter a valid amount" },
  "link_copied": { ru: "Ссылка скопирована в буфер обмена!", en: "Link copied to clipboard!" },
  "copy": { ru: "Копировать", en: "Copy" },
  "share_link": { ru: "Ссылка для шаринга", en: "Share Link" },
  
  // Chat
  "chat": { ru: "Чат поездки", en: "Trip Chat" },
  "message": { ru: "Сообщение", en: "Message" },
  "send": { ru: "Отправить", en: "Send" },
  
  // Summary
  "summary": { ru: "Саммари поездки", en: "Trip Summary" },
  "copy_summary": { ru: "Копировать саммари", en: "Copy Summary" },
  "general_info": { ru: "Общая информация", en: "General Information" },
  "trip_dates": { ru: "Даты поездки", en: "Trip Dates" },
  "daily_plan": { ru: "План по дням", en: "Daily Plan" },
  "individual_plans": { ru: "Индивидуальные планы", en: "Individual Plans" },
  "activities_by_participant": { ru: "Активности по участникам", en: "Activities by Participant" },

  "no_activities_day": { ru: "Нет запланированных активностей на этот день", en: "No activities planned for this day" },
  
  // Language
  "language": { ru: "Язык", en: "Language" },
  "russian": { ru: "Русский", en: "Russian" },
  "english": { ru: "Английский", en: "English" },

  // New Additions
  "cannot_delete_creator": { ru: "Нельзя удалить создателя поездки", en: "Cannot delete trip creator" },
  "invite_participant_title": { ru: "Пригласить участника", en: "Invite Participant" },
  "invite_participant_desc": { ru: "Введите email пользователя, которого хотите пригласить в поездку", en: "Enter the email of the user you want to invite to the trip" },
  "participant_email": { ru: "Email участника", en: "Participant Email" },
  "add_expense_desc": { ru: "Внесите информацию о расходе и выберите, кто его оплатил и с кем делится", en: "Enter expense details and select who paid and who shares it" },
  "trip_plan": { ru: "ПЛАН ПУТЕШЕСТВИЯ", en: "TRIP PLAN" },
  "transport_plane": { ru: "Самолет", en: "Plane" },
  "transport_train": { ru: "Поезд", en: "Train" },
  "transport_bus": { ru: "Автобус", en: "Bus" },
  "transport_car": { ru: "Автомобиль", en: "Car" },
  "transport_ship": { ru: "Корабль", en: "Ship" },
  "transport_other": { ru: "Другое", en: "Other" },
  "image": { ru: "Изображение", en: "Image" },
  "split_between": { ru: "разделить между", en: "split between" },
  "total_category": { ru: "Итого по категории", en: "Total for category" },
  "from_preposition": { ru: "из", en: "from" },
  "in_preposition": { ru: "в", en: "in" },
  "map": { ru: "Карта", en: "Map" },


  "add_generic": { ru: "Добавить", en: "Add" },
  "place_status": { ru: "Статус", en: "Status" },
  "activity_desc_placeholder": { ru: "Добавьте активность с описанием, картинкой и ссылкой", en: "Add an activity with a description, image, and link" },
  "trip_day": { ru: "День путешествия", en: "Trip Day" },
  "time_placeholder": { ru: "Время (например: 10:00)", en: "Time (e.g. 10:00)" },
  "transport_desc": { ru: "Добавьте информацию о транспорте", en: "Add transport information" },
  "transport_type": { ru: "Тип транспорта", en: "Transport Type" },

  "participants_count": { ru: "Участников", en: "Participants" },
  "creator": { ru: "👑 Создатель", en: "👑 Creator" },
  "general_progress": { ru: "Общий прогресс", en: "Total Progress" },
  "confirm_delete_place": { ru: "Удалить это место?", en: "Delete this place?" },
  "confirm_delete_activity": { ru: "Удалить эту активность?", en: "Delete this activity?" },
  "confirm_delete_accommodation": { ru: "Удалить это жилье?", en: "Delete this accommodation?" },
  "confirm_delete_transport": { ru: "Удалить этот транспорт?", en: "Delete this transport?" },
  "user_not_invited_self": { ru: "Пользователь уже добавлен в поездку", en: "User is already in the trip" },
  "user_invited_success": { ru: "добавлен в поездку!", en: "added to the trip!" },
  "user_email_not_found": { ru: "Пользователь с таким email не найден", en: "User with this email not found" },
  "delete_transport_confirm": { ru: "Удалить этот транспорт?", en: "Delete this transport?" },
  "confirm_delete_participant": { ru: "Удалить этого участника из поездки?", en: "Remove this participant from the trip?" },
  "day_param": { ru: "День {day} в {time}", en: "Day {day} at {time}" },
  "field_required": { ru: "Это поле обязательно для заполнения", en: "This field is required" },
  "guests": { ru: "Количество гостей", en: "Number of guests" },
  
};

export const t = (key: string, lang: Language): string => {
  return translations[key]?.[lang] || key;
};

