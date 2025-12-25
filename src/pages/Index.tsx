import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import QRCode from 'react-qr-code';
import { api } from '@/lib/api';

type UserRole = 
  | 'client' 
  | 'cashier' 
  | 'head_cashier' 
  | 'admin' 
  | 'creator' 
  | 'nikitovsky'
  | 'super_admin'
  | 'manager'
  | 'support'
  | 'specialist'
  | 'technician'
  | 'operator'
  | 'supervisor'
  | 'coordinator'
  | 'assistant'
  | 'consultant'
  | 'analyst'
  | 'controller'
  | 'inspector'
  | 'executor'
  | 'director'
  | 'deputy'
  | 'chief'
  | 'senior'
  | 'junior'
  | 'trainee';

type Item = {
  id: string;
  qr_number: string;
  client_name: string;
  client_phone: string;
  client_email?: string;
  item_description: string;
  department: 'documents' | 'photos' | 'other';
  deposit_amount: number;
  return_amount: number;
  deposit_date: string;
  expected_return_date: string;
  status: 'stored' | 'returned';
  returned_date?: string;
};

type User = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  role: UserRole;
  is_active: boolean;
};

const ROLE_PASSWORDS: Record<UserRole, string> = {
  client: '',
  cashier: '25',
  head_cashier: '202520',
  admin: '2025',
  creator: '202505',
  nikitovsky: '20252025',
  super_admin: '2505',
  manager: '250',
  support: '250',
  specialist: '250',
  technician: '250',
  operator: '250',
  supervisor: '250',
  coordinator: '250',
  assistant: '250',
  consultant: '250',
  analyst: '250',
  controller: '250',
  inspector: '250',
  executor: '250',
  director: '250',
  deputy: '250',
  chief: '250',
  senior: '250',
  junior: '250',
  trainee: '250'
};

const ROLE_NAMES: Record<UserRole, string> = {
  client: 'Клиент',
  cashier: 'Кассир',
  head_cashier: 'Главный кассир',
  admin: 'Администратор',
  creator: 'Создатель',
  nikitovsky: 'Никитовский',
  super_admin: '24У (Супер-админ)',
  manager: 'Менеджер',
  support: 'Поддержка',
  specialist: 'Специалист',
  technician: 'Техник',
  operator: 'Оператор',
  supervisor: 'Супервайзер',
  coordinator: 'Координатор',
  assistant: 'Ассистент',
  consultant: 'Консультант',
  analyst: 'Аналитик',
  controller: 'Контролёр',
  inspector: 'Инспектор',
  executor: 'Исполнитель',
  director: 'Директор',
  deputy: 'Заместитель',
  chief: 'Руководитель',
  senior: 'Старший',
  junior: 'Младший',
  trainee: 'Стажёр'
};

const DEPARTMENT_LIMITS = {
  documents: 100,
  photos: 100,
  other: 90
};

const MUSIC_TRACKS = [
  'https://cdn.poehali.dev/projects/d8db035b-4f3f-4320-946f-f65eee67ced7/bucket/Fiksaj_Vremya.mp3',
  'https://cdn.poehali.dev/projects/d8db035b-4f3f-4320-946f-f65eee67ced7/bucket/Fiksaj_Mednyj_gorod.mp3',
  'https://cdn.poehali.dev/projects/d8db035b-4f3f-4320-946f-f65eee67ced7/bucket/Фиксай%20моя%20жизнь%20моё%20шоу.MP3'
];

export default function Index() {
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<{ role: UserRole; name: string; id: string } | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [archivedItems, setArchivedItems] = useState<Item[]>([]);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [selectedQR, setSelectedQR] = useState('');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showSMSDialog, setShowSMSDialog] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [volume, setVolume] = useState(40);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [scannedQR, setScannedQR] = useState('');
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
      audioRef.current.play().catch(() => {});
    }
  }, [volume, currentTrack]);

  const loadData = async () => {
    try {
      const [usersData, itemsData] = await Promise.all([
        api.getUsers(),
        api.getItems('stored')
      ]);
      setUsers(usersData.users || []);
      setItems(itemsData.items || []);

      const archivedData = await api.getItems('returned');
      setArchivedItems(archivedData.items || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleLogin = async (role: UserRole, name: string, password: string) => {
    if (role !== 'client') {
      if (ROLE_PASSWORDS[role] !== password) {
        toast({
          title: 'Неверный пароль',
          variant: 'destructive'
        });
        return;
      }

      const user = users.find(u => u.name === name && u.role === role);
      if (!user) {
        toast({
          title: 'Пользователь не найден',
          description: 'Обратитесь к администратору для регистрации',
          variant: 'destructive'
        });
        return;
      }

      setCurrentUser({ role, name, id: user.id });
    } else {
      const user = users.find(u => u.phone === name && u.role === 'client');
      if (!user) {
        toast({
          title: 'Клиент не найден',
          description: 'Обратитесь к кассиру для регистрации',
          variant: 'destructive'
        });
        return;
      }
      setCurrentUser({ role, name: user.name, id: user.id });
    }

    toast({
      title: 'Добро пожаловать!',
      description: `Вход выполнен: ${name}`
    });
  };

  const handleLogout = () => {
    setCurrentUser(null);
    toast({
      title: 'Выход выполнен'
    });
  };

  const generateQRNumber = () => {
    const digits = '0123456789';
    let qr = 'QR';
    for (let i = 0; i < 12; i++) {
      qr += digits[Math.floor(Math.random() * digits.length)];
    }
    return qr;
  };

  const addItem = async (item: Omit<Item, 'id' | 'qr_number' | 'status'>) => {
    const departmentItems = items.filter(i => i.department === item.department);
    if (departmentItems.length >= DEPARTMENT_LIMITS[item.department]) {
      toast({
        title: 'Отдел переполнен',
        description: `Максимум ${DEPARTMENT_LIMITS[item.department]} предметов`,
        variant: 'destructive'
      });
      return;
    }

    const qrNumber = generateQRNumber();
    
    try {
      const response = await api.createItem({
        qrNumber,
        clientName: item.client_name,
        clientPhone: item.client_phone,
        clientEmail: item.client_email,
        itemDescription: item.item_description,
        department: item.department,
        depositAmount: item.deposit_amount,
        returnAmount: item.return_amount,
        depositDate: item.deposit_date,
        expectedReturnDate: item.expected_return_date
      });

      toast({
        title: 'Товар принят',
        description: `QR-код: ${qrNumber}`
      });

      setSelectedQR(qrNumber);
      setSelectedItem(response.item);
      setShowQRDialog(true);
      await loadData();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить товар',
        variant: 'destructive'
      });
    }
  };

  const returnItem = async (qrNumber: string) => {
    try {
      await api.returnItem(qrNumber);
      
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(`Номер ${qrNumber}`);
        utterance.lang = 'ru-RU';
        window.speechSynthesis.speak(utterance);
      }
      
      toast({
        title: 'Товар выдан',
        description: `QR: ${qrNumber}`
      });

      await loadData();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Товар не найден',
        variant: 'destructive'
      });
    }
  };

  const createUser = async (data: { name: string; role: UserRole; phone?: string; email?: string }) => {
    try {
      await api.createUser({
        ...data,
        created_by: currentUser?.id
      });
      
      toast({
        title: 'Пользователь создан',
        description: `${data.name} (${ROLE_NAMES[data.role]})`
      });

      await loadData();
      setShowUserManagement(false);
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось создать пользователя',
        variant: 'destructive'
      });
    }
  };

  const sendSMS = async (phone: string, message: string, itemId?: string) => {
    try {
      await api.sendSMS({
        phone,
        message,
        itemId,
        sentBy: currentUser?.id
      });

      toast({
        title: 'SMS отправлено',
        description: `На номер ${phone}`
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось отправить SMS',
        variant: 'destructive'
      });
    }
  };

  const printForm = (item: Item) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Анкета клиента</title>
          <style>
            @page { size: A4; margin: 2cm; }
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .field { margin: 15px 0; }
            .label { font-weight: bold; }
            .qr-code { text-align: center; margin: 20px 0; }
          </style>
        </head>
        <body>
          <h1>АНКЕТА КЛИЕНТА</h1>
          <div class="field"><span class="label">ФИО:</span> ${item.client_name}</div>
          <div class="field"><span class="label">Телефон:</span> ${item.client_phone}</div>
          <div class="field"><span class="label">Email:</span> ${item.client_email || '—'}</div>
          <div class="field"><span class="label">Описание предмета:</span> ${item.item_description}</div>
          <div class="field"><span class="label">Отдел:</span> ${item.department === 'documents' ? 'Документы' : item.department === 'photos' ? 'Фото/Карты' : 'Другое'}</div>
          <div class="field"><span class="label">Оплата при сдаче:</span> ${item.deposit_amount} ₽</div>
          <div class="field"><span class="label">Оплата при получении:</span> ${item.return_amount} ₽</div>
          <div class="field"><span class="label">Дата приёма:</span> ${new Date(item.deposit_date).toLocaleDateString()}</div>
          <div class="field"><span class="label">Дата выдачи:</span> ${new Date(item.expected_return_date).toLocaleDateString()}</div>
          <div class="qr-code">
            <div style="font-size: 24px; font-weight: bold; margin: 20px 0;">${item.qr_number}</div>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const canManageUsers = ['nikitovsky', 'super_admin', 'creator', 'head_cashier', 'manager', 'support'].includes(currentUser?.role || '');
  const canViewArchive = ['admin', 'creator', 'nikitovsky', 'super_admin'].includes(currentUser?.role || '');

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} users={users} />;
  }

  const nextTrack = () => setCurrentTrack((prev) => (prev + 1) % MUSIC_TRACKS.length);
  const prevTrack = () => setCurrentTrack((prev) => (prev - 1 + MUSIC_TRACKS.length) % MUSIC_TRACKS.length);

  return (
    <div className="min-h-screen bg-background">
      <audio
        ref={audioRef}
        src={MUSIC_TRACKS[currentTrack]}
        loop={false}
        autoPlay
        onEnded={nextTrack}
      />

      <header className="border-b bg-white sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Icon name="QrCode" size={28} className="text-accent" />
            <div>
              <h1 className="text-xl font-bold">Система QR-документов</h1>
              <p className="text-xs text-muted-foreground">{new Date().toLocaleString('ru-RU')}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 border rounded-lg px-3 py-1">
              <Button variant="ghost" size="sm" onClick={prevTrack}>
                <Icon name="SkipBack" size={16} />
              </Button>
              <Icon name="Music" size={16} className="text-accent" />
              <Slider
                value={[volume]}
                onValueChange={(v) => setVolume(v[0])}
                max={100}
                step={1}
                className="w-20"
              />
              <span className="text-xs w-8">{volume}%</span>
              <Button variant="ghost" size="sm" onClick={nextTrack}>
                <Icon name="SkipForward" size={16} />
              </Button>
            </div>

            <div className="text-right">
              <p className="text-sm font-medium">{currentUser.name}</p>
              <Badge variant="secondary" className="text-xs">{ROLE_NAMES[currentUser.role]}</Badge>
            </div>

            <Button onClick={handleLogout} variant="outline" size="sm">
              <Icon name="LogOut" className="mr-1" size={14} />
              Выход
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {currentUser.role !== 'client' && (
          <Card className="mb-4 bg-muted/50">
            <CardContent className="py-3">
              <div className="text-sm space-y-1">
                <p className="font-semibold">Пароли ролей:</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <span>Кассир: <b>25</b></span>
                  <span>Главный кассир: <b>202520</b></span>
                  <span>Администратор: <b>2025</b></span>
                  <span>Никитовский: <b>20252025</b></span>
                  <span>Создатель: <b>202505</b></span>
                  <span>24У: <b>2505</b></span>
                  <span>Менеджер/Другие: <b>250</b></span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="main" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="main">Главная</TabsTrigger>
            <TabsTrigger value="accept">Приём</TabsTrigger>
            <TabsTrigger value="return">Выдача</TabsTrigger>
            <TabsTrigger value="sms">SMS</TabsTrigger>
            <TabsTrigger value="archive">Архив</TabsTrigger>
          </TabsList>

          <TabsContent value="main">
            <MainDashboard 
              items={items} 
              onManageUsers={() => setShowUserManagement(true)}
              canManageUsers={canManageUsers}
            />
          </TabsContent>

          <TabsContent value="accept">
            <AcceptItemForm onSubmit={addItem} />
          </TabsContent>

          <TabsContent value="return">
            <ReturnItemForm 
              onReturn={returnItem} 
              onScan={() => setShowQRScanner(true)}
              scannedQR={scannedQR}
              setScannedQR={setScannedQR}
            />
          </TabsContent>

          <TabsContent value="sms">
            <SMSModule items={items} onSend={sendSMS} />
          </TabsContent>

          <TabsContent value="archive">
            <ArchiveView items={archivedItems} canView={canViewArchive} onPrint={printForm} />
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>QR-код товара</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 p-4">
            <QRCode value={selectedQR} size={200} />
            <p className="font-mono text-xl font-bold">{selectedQR}</p>
            {selectedItem && (
              <div className="text-sm text-center space-y-1">
                <p className="font-medium">{selectedItem.client_name}</p>
                <p className="text-muted-foreground">{selectedItem.item_description}</p>
              </div>
            )}
            <div className="flex gap-2 w-full">
              <Button onClick={() => selectedItem && printForm(selectedItem)} variant="outline" className="flex-1">
                <Icon name="Printer" className="mr-2" size={16} />
                Печать анкеты
              </Button>
              <Button onClick={() => window.print()} className="flex-1">
                <Icon name="Download" className="mr-2" size={16} />
                Печать QR
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showUserManagement} onOpenChange={setShowUserManagement}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Управление пользователями</DialogTitle>
          </DialogHeader>
          <UserManagementForm 
            onSubmit={createUser} 
            users={users}
            currentRole={currentUser.role}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showQRScanner} onOpenChange={setShowQRScanner}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Сканер QR-кодов</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={scannedQR}
              onChange={(e) => setScannedQR(e.target.value)}
              placeholder="Введите или отсканируйте QR"
              autoFocus
            />
            <Button onClick={() => {
              returnItem(scannedQR);
              setShowQRScanner(false);
              setScannedQR('');
            }} className="w-full">
              Выдать товар
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LoginScreen({ onLogin, users }: { onLogin: (role: UserRole, name: string, password: string) => void; users: User[] }) {
  const [selectedRole, setSelectedRole] = useState<UserRole>('client');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showKeypad, setShowKeypad] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    onLogin(selectedRole, name, password);
  };

  const addDigit = (digit: string) => {
    setPassword(password + digit);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-accent rounded-full flex items-center justify-center">
            <Icon name="Shield" size={32} className="text-white" />
          </div>
          <CardTitle className="text-2xl">Система QR-документов</CardTitle>
          <CardDescription>Выберите роль и войдите</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Роль</Label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {Object.entries(ROLE_NAMES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{selectedRole === 'client' ? 'Номер телефона' : 'Имя пользователя'}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={selectedRole === 'client' ? '+7 999 123-45-67' : 'Введите имя'}
                required
              />
            </div>

            {selectedRole !== 'client' && (
              <div className="space-y-2">
                <Label>Пароль</Label>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••"
                    required
                  />
                  <Button type="button" onClick={() => setShowKeypad(!showKeypad)} variant="outline">
                    <Icon name="Grid3x3" size={16} />
                  </Button>
                </div>

                {showKeypad && (
                  <div className="grid grid-cols-3 gap-2 p-2 bg-muted rounded-lg">
                    {[1,2,3,4,5,6,7,8,9,0].map(num => (
                      <Button key={num} type="button" onClick={() => addDigit(num.toString())} variant="secondary">
                        {num}
                      </Button>
                    ))}
                    <Button type="button" onClick={() => setPassword('')} variant="destructive" className="col-span-2">
                      Очистить
                    </Button>
                  </div>
                )}
              </div>
            )}

            <Button type="submit" className="w-full">
              <Icon name="LogIn" className="mr-2" size={16} />
              Войти
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function MainDashboard({ items, onManageUsers, canManageUsers }: { items: Item[]; onManageUsers: () => void; canManageUsers: boolean }) {
  const stats = {
    documents: items.filter(i => i.department === 'documents').length,
    photos: items.filter(i => i.department === 'photos').length,
    other: items.filter(i => i.department === 'other').length,
    total: items.length
  };

  return (
    <div className="space-y-4">
      {canManageUsers && (
        <Button onClick={onManageUsers} className="w-full">
          <Icon name="UserPlus" className="mr-2" size={16} />
          Управление пользователями
        </Button>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Документы</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.documents}/{DEPARTMENT_LIMITS.documents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Фото/Карты</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.photos}/{DEPARTMENT_LIMITS.photos}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Другое</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.other}/{DEPARTMENT_LIMITS.other}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Всего</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Последние поступления</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {items.slice(-5).reverse().map(item => (
              <div key={item.id} className="flex justify-between items-center p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{item.item_description}</p>
                  <p className="text-sm text-muted-foreground">{item.client_name} • {item.qr_number}</p>
                </div>
                <Badge>{item.deposit_amount} ₽</Badge>
              </div>
            ))}
            {items.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Нет товаров</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AcceptItemForm({ onSubmit }: { onSubmit: (item: any) => void }) {
  const [formData, setFormData] = useState({
    client_name: '',
    client_phone: '',
    client_email: '',
    item_description: '',
    department: 'documents' as 'documents' | 'photos' | 'other',
    deposit_amount: '',
    return_amount: '',
    deposit_date: new Date().toISOString().split('T')[0],
    expected_return_date: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      deposit_amount: Number(formData.deposit_amount),
      return_amount: Number(formData.return_amount)
    });
    setFormData({
      client_name: '',
      client_phone: '',
      client_email: '',
      item_description: '',
      department: 'documents',
      deposit_amount: '',
      return_amount: '',
      deposit_date: new Date().toISOString().split('T')[0],
      expected_return_date: ''
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Приём товара</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>ФИО *</Label>
            <Input value={formData.client_name} onChange={(e) => setFormData({...formData, client_name: e.target.value})} required />
          </div>
          <div className="space-y-2">
            <Label>Телефон *</Label>
            <Input value={formData.client_phone} onChange={(e) => setFormData({...formData, client_phone: e.target.value})} required />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={formData.client_email} onChange={(e) => setFormData({...formData, client_email: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Отдел *</Label>
            <Select value={formData.department} onValueChange={(v: any) => setFormData({...formData, department: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="documents">Документы</SelectItem>
                <SelectItem value="photos">Фото/Карты</SelectItem>
                <SelectItem value="other">Другое</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Описание *</Label>
            <Textarea value={formData.item_description} onChange={(e) => setFormData({...formData, item_description: e.target.value})} required />
          </div>
          <div className="space-y-2">
            <Label>Оплата при сдаче (₽) *</Label>
            <Input type="number" value={formData.deposit_amount} onChange={(e) => setFormData({...formData, deposit_amount: e.target.value})} required />
          </div>
          <div className="space-y-2">
            <Label>Оплата при получении (₽) *</Label>
            <Input type="number" value={formData.return_amount} onChange={(e) => setFormData({...formData, return_amount: e.target.value})} required />
          </div>
          <div className="space-y-2">
            <Label>Дата приёма *</Label>
            <Input type="date" value={formData.deposit_date} onChange={(e) => setFormData({...formData, deposit_date: e.target.value})} required />
          </div>
          <div className="space-y-2">
            <Label>Дата выдачи *</Label>
            <Input type="date" value={formData.expected_return_date} onChange={(e) => setFormData({...formData, expected_return_date: e.target.value})} required />
          </div>
          <Button type="submit" className="md:col-span-2">
            <Icon name="Plus" className="mr-2" size={16} />
            Принять товар
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ReturnItemForm({ onReturn, onScan, scannedQR, setScannedQR }: any) {
  const [qr, setQr] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onReturn(qr || scannedQR);
    setQr('');
    setScannedQR('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Выдача товара</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>QR-код</Label>
            <div className="flex gap-2">
              <Input value={qr || scannedQR} onChange={(e) => setQr(e.target.value)} placeholder="QR123456789012" required />
              <Button type="button" onClick={onScan} variant="outline">
                <Icon name="ScanLine" size={16} />
              </Button>
            </div>
          </div>
          <Button type="submit" className="w-full">
            <Icon name="PackageCheck" className="mr-2" size={16} />
            Выдать товар
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function SMSModule({ items, onSend }: { items: Item[]; onSend: (phone: string, message: string, itemId?: string) => void }) {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [selectedItem, setSelectedItem] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    onSend(phone, message, selectedItem || undefined);
    setPhone('');
    setMessage('');
    setSelectedItem('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>SMS-уведомления</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSend} className="space-y-4">
          <div className="space-y-2">
            <Label>Товар (опционально)</Label>
            <Select value={selectedItem} onValueChange={setSelectedItem}>
              <SelectTrigger><SelectValue placeholder="Выберите товар" /></SelectTrigger>
              <SelectContent>
                {items.map(item => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.qr_number} - {item.client_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Телефон *</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 999 123-45-67" required />
          </div>
          <div className="space-y-2">
            <Label>Сообщение *</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ваш товар готов к выдаче..." required rows={4} />
          </div>
          <Button type="submit" className="w-full">
            <Icon name="MessageSquare" className="mr-2" size={16} />
            Отправить SMS
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ArchiveView({ items, canView, onPrint }: { items: Item[]; canView: boolean; onPrint: (item: Item) => void }) {
  if (!canView) {
    return (
      <Alert>
        <Icon name="Lock" className="h-4 w-4" />
        <AlertDescription>У вас нет доступа к архиву</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Архив ({items.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="p-3 border rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium">{item.item_description}</p>
                  <p className="text-sm text-muted-foreground">{item.qr_number}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => onPrint(item)}>
                  <Icon name="Printer" size={14} />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Клиент:</span> {item.client_name}</div>
                <div><span className="text-muted-foreground">Телефон:</span> {item.client_phone}</div>
              </div>
            </div>
          ))}
          {items.length === 0 && <p className="text-center text-muted-foreground py-8">Архив пуст</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function UserManagementForm({ onSubmit, users, currentRole }: { onSubmit: (data: any) => void; users: User[]; currentRole: UserRole }) {
  const [formData, setFormData] = useState({
    name: '',
    role: 'cashier' as UserRole,
    phone: '',
    email: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({ name: '', role: 'cashier', phone: '', email: '' });
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4 border-b pb-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Имя *</Label>
            <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
          </div>
          <div className="space-y-2">
            <Label>Роль *</Label>
            <Select value={formData.role} onValueChange={(v: UserRole) => setFormData({...formData, role: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-60">
                {Object.entries(ROLE_NAMES).filter(([key]) => key !== 'client').map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Телефон</Label>
            <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
          </div>
        </div>
        <Button type="submit" className="w-full">
          <Icon name="UserPlus" className="mr-2" size={16} />
          Создать пользователя
        </Button>
      </form>

      <div className="space-y-2 max-h-60 overflow-y-auto">
        <p className="font-semibold text-sm">Зарегистрированные ({users.length}):</p>
        {users.map(user => (
          <div key={user.id} className="flex justify-between items-center p-2 border rounded text-sm">
            <div>
              <p className="font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{ROLE_NAMES[user.role]}</p>
            </div>
            <Badge variant={user.is_active ? 'default' : 'secondary'}>
              {user.is_active ? 'Активен' : 'Неактивен'}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
