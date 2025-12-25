import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import QRCode from 'react-qr-code';

type UserRole = 'client' | 'cashier' | 'head_cashier' | 'admin' | 'creator' | 'nikitovsky';

type Item = {
  id: string;
  qrNumber: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  itemDescription: string;
  department: 'documents' | 'photos' | 'other';
  depositAmount: number;
  returnAmount: number;
  depositDate: string;
  expectedReturnDate: string;
  status: 'stored' | 'returned';
  returnedDate?: string;
  discount?: number;
  bonusCard?: string;
};

const ROLE_PASSWORDS: Record<UserRole, string> = {
  client: '',
  cashier: '25',
  head_cashier: '202520',
  admin: '2025',
  creator: '202505',
  nikitovsky: '20252025'
};

const DEPARTMENT_LIMITS = {
  documents: 100,
  photos: 100,
  other: Infinity
};

export default function Index() {
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<{ role: UserRole; name: string } | null>(null);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState<number | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [archivedItems, setArchivedItems] = useState<Item[]>([]);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [selectedQR, setSelectedQR] = useState('');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  useEffect(() => {
    if (lockoutTime) {
      const timer = setInterval(() => {
        const remaining = Math.ceil((lockoutTime - Date.now()) / 1000);
        if (remaining <= 0) {
          setLockoutTime(null);
          setLoginAttempts(0);
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [lockoutTime]);

  const handleLogin = (role: UserRole, name: string, password: string) => {
    if (lockoutTime && Date.now() < lockoutTime) {
      const remaining = Math.ceil((lockoutTime - Date.now()) / 1000);
      toast({
        title: 'Доступ заблокирован',
        description: `Подождите ${remaining} секунд`,
        variant: 'destructive'
      });
      return;
    }

    if (role === 'client' || ROLE_PASSWORDS[role] === password) {
      setCurrentUser({ role, name });
      setLoginAttempts(0);
      setLockoutTime(null);
      toast({
        title: 'Добро пожаловать!',
        description: `Вход выполнен: ${name}`
      });
    } else {
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);
      
      if (newAttempts >= 3) {
        setLockoutTime(Date.now() + 90000);
        toast({
          title: 'Превышен лимит попыток',
          description: 'Доступ заблокирован на 90 секунд',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Неверный пароль',
          description: `Осталось попыток: ${3 - newAttempts}`,
          variant: 'destructive'
        });
      }
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    toast({
      title: 'Выход выполнен',
      description: 'До свидания!'
    });
  };

  const addItem = (item: Omit<Item, 'id' | 'qrNumber' | 'status'>) => {
    const departmentItems = items.filter(i => i.department === item.department && i.status === 'stored');
    if (departmentItems.length >= DEPARTMENT_LIMITS[item.department]) {
      toast({
        title: 'Отдел переполнен',
        description: `Максимум ${DEPARTMENT_LIMITS[item.department]} предметов`,
        variant: 'destructive'
      });
      return;
    }

    const qrNumber = `QR${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const newItem: Item = {
      ...item,
      id: crypto.randomUUID(),
      qrNumber,
      status: 'stored'
    };
    
    setItems([...items, newItem]);
    toast({
      title: 'Товар принят',
      description: `QR-код: ${qrNumber}`
    });
    
    setSelectedQR(qrNumber);
    setSelectedItem(newItem);
    setShowQRDialog(true);
  };

  const returnItem = (qrNumber: string) => {
    const item = items.find(i => i.qrNumber === qrNumber);
    if (!item) {
      toast({
        title: 'Товар не найден',
        description: 'Проверьте QR-код',
        variant: 'destructive'
      });
      return;
    }

    const updatedItem = { ...item, status: 'returned' as const, returnedDate: new Date().toISOString() };
    setItems(items.filter(i => i.id !== item.id));
    setArchivedItems([...archivedItems, updatedItem]);
    
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(`Номер ${qrNumber}`);
      utterance.lang = 'ru-RU';
      window.speechSynthesis.speak(utterance);
    }
    
    toast({
      title: 'Товар выдан',
      description: `QR: ${qrNumber}`
    });
  };

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} lockoutTime={lockoutTime} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Icon name="QrCode" size={32} className="text-accent" />
            <h1 className="text-2xl font-bold">Система QR-документов</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Пользователь</p>
              <p className="font-medium">{currentUser.name}</p>
            </div>
            <Button onClick={handleLogout} variant="outline">
              <Icon name="LogOut" className="mr-2" size={16} />
              Выход
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="main" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="main">Главная</TabsTrigger>
            <TabsTrigger value="accept">Приём товара</TabsTrigger>
            <TabsTrigger value="return">Выдача товара</TabsTrigger>
            <TabsTrigger value="archive">Архив</TabsTrigger>
          </TabsList>

          <TabsContent value="main">
            <MainDashboard items={items} role={currentUser.role} />
          </TabsContent>

          <TabsContent value="accept">
            <AcceptItemForm onSubmit={addItem} role={currentUser.role} />
          </TabsContent>

          <TabsContent value="return">
            <ReturnItemForm onReturn={returnItem} items={items} />
          </TabsContent>

          <TabsContent value="archive">
            <ArchiveView items={archivedItems} role={currentUser.role} />
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>QR-код товара</DialogTitle>
            <DialogDescription>Сохраните или распечатайте QR-код</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 p-4">
            <QRCode value={selectedQR} size={256} />
            <p className="font-mono text-lg font-bold">{selectedQR}</p>
            {selectedItem && (
              <div className="text-sm text-center">
                <p>{selectedItem.clientName}</p>
                <p>{selectedItem.itemDescription}</p>
              </div>
            )}
            <Button onClick={() => window.print()} className="w-full">
              <Icon name="Printer" className="mr-2" size={16} />
              Печать
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LoginScreen({ onLogin, lockoutTime }: { onLogin: (role: UserRole, name: string, password: string) => void; lockoutTime: number | null }) {
  const [selectedRole, setSelectedRole] = useState<UserRole>('client');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    onLogin(selectedRole, name, password);
  };

  const remainingTime = lockoutTime ? Math.ceil((lockoutTime - Date.now()) / 1000) : 0;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100">
      <Card className="w-full max-w-md animate-fade-in">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-accent rounded-full flex items-center justify-center">
            <Icon name="QrCode" size={32} className="text-white" />
          </div>
          <CardTitle className="text-3xl">Система QR-документов</CardTitle>
          <CardDescription>Выберите роль и войдите в систему</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role">Роль</Label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Клиент</SelectItem>
                  <SelectItem value="cashier">Кассир</SelectItem>
                  <SelectItem value="head_cashier">Главный кассир</SelectItem>
                  <SelectItem value="admin">Администратор</SelectItem>
                  <SelectItem value="creator">Создатель</SelectItem>
                  <SelectItem value="nikitovsky">Никитовский</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">{selectedRole === 'client' ? 'Номер телефона' : 'Имя'}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={selectedRole === 'client' ? '+7 999 123-45-67' : 'Введите имя'}
                required
              />
            </div>

            {selectedRole !== 'client' && (
              <div className="space-y-2">
                <Label htmlFor="password">Пароль</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  required
                />
              </div>
            )}

            {lockoutTime && remainingTime > 0 && (
              <Alert variant="destructive">
                <Icon name="AlertCircle" className="h-4 w-4" />
                <AlertDescription>
                  Доступ заблокирован. Осталось: {remainingTime} сек
                </AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={lockoutTime && remainingTime > 0}>
              <Icon name="LogIn" className="mr-2" size={16} />
              Войти
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function MainDashboard({ items, role }: { items: Item[]; role: UserRole }) {
  const stats = {
    documents: items.filter(i => i.department === 'documents' && i.status === 'stored').length,
    photos: items.filter(i => i.department === 'photos' && i.status === 'stored').length,
    other: items.filter(i => i.department === 'other' && i.status === 'stored').length,
    total: items.filter(i => i.status === 'stored').length
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Документы</CardTitle>
            <Icon name="FileText" className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.documents}/100</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Фото/Карты</CardTitle>
            <Icon name="Image" className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.photos}/100</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Другое</CardTitle>
            <Icon name="Package" className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.other}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего на хранении</CardTitle>
            <Icon name="Archive" className="h-4 w-4 text-muted-foreground" />
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
          <div className="space-y-4">
            {items.filter(i => i.status === 'stored').slice(-5).reverse().map(item => (
              <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-accent/10 rounded flex items-center justify-center">
                    <Icon name="Package" className="text-accent" />
                  </div>
                  <div>
                    <p className="font-medium">{item.itemDescription}</p>
                    <p className="text-sm text-muted-foreground">{item.clientName} • {item.qrNumber}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{item.depositAmount} ₽</p>
                  <p className="text-xs text-muted-foreground">{new Date(item.depositDate).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Нет товаров на хранении</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AcceptItemForm({ onSubmit, role }: { onSubmit: (item: any) => void; role: UserRole }) {
  const [formData, setFormData] = useState({
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    itemDescription: '',
    department: 'documents' as 'documents' | 'photos' | 'other',
    depositAmount: '',
    returnAmount: '',
    depositDate: new Date().toISOString().split('T')[0],
    expectedReturnDate: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      depositAmount: Number(formData.depositAmount),
      returnAmount: Number(formData.returnAmount)
    });
    setFormData({
      clientName: '',
      clientPhone: '',
      clientEmail: '',
      itemDescription: '',
      department: 'documents',
      depositAmount: '',
      returnAmount: '',
      depositDate: new Date().toISOString().split('T')[0],
      expectedReturnDate: ''
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Приём товара на хранение</CardTitle>
        <CardDescription>Заполните анкету клиента</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="clientName">ФИО клиента *</Label>
              <Input
                id="clientName"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientPhone">Телефон *</Label>
              <Input
                id="clientPhone"
                type="tel"
                value={formData.clientPhone}
                onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                placeholder="+7 999 123-45-67"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientEmail">Email (опционально)</Label>
              <Input
                id="clientEmail"
                type="email"
                value={formData.clientEmail}
                onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Отдел *</Label>
              <Select value={formData.department} onValueChange={(v: any) => setFormData({ ...formData, department: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="documents">Документы</SelectItem>
                  <SelectItem value="photos">Фото/Карты</SelectItem>
                  <SelectItem value="other">Другое</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="itemDescription">Описание предмета *</Label>
              <Textarea
                id="itemDescription"
                value={formData.itemDescription}
                onChange={(e) => setFormData({ ...formData, itemDescription: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="depositAmount">Оплата при сдаче (₽) *</Label>
              <Input
                id="depositAmount"
                type="number"
                value={formData.depositAmount}
                onChange={(e) => setFormData({ ...formData, depositAmount: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="returnAmount">Оплата при получении (₽) *</Label>
              <Input
                id="returnAmount"
                type="number"
                value={formData.returnAmount}
                onChange={(e) => setFormData({ ...formData, returnAmount: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="depositDate">Дата приёма *</Label>
              <Input
                id="depositDate"
                type="date"
                value={formData.depositDate}
                onChange={(e) => setFormData({ ...formData, depositDate: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expectedReturnDate">Когда заберёте *</Label>
              <Input
                id="expectedReturnDate"
                type="date"
                value={formData.expectedReturnDate}
                onChange={(e) => setFormData({ ...formData, expectedReturnDate: e.target.value })}
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full">
            <Icon name="Plus" className="mr-2" size={16} />
            Принять товар и создать QR-код
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ReturnItemForm({ onReturn, items }: { onReturn: (qr: string) => void; items: Item[] }) {
  const [qrInput, setQrInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onReturn(qrInput);
    setQrInput('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Выдача товара</CardTitle>
        <CardDescription>Отсканируйте или введите QR-код</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="qrInput">QR-код</Label>
            <Input
              id="qrInput"
              value={qrInput}
              onChange={(e) => setQrInput(e.target.value)}
              placeholder="QR1234567890"
              required
            />
          </div>
          <Button type="submit" className="w-full">
            <Icon name="Package" className="mr-2" size={16} />
            Выдать товар
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ArchiveView({ items, role }: { items: Item[]; role: UserRole }) {
  const canViewArchive = ['admin', 'creator', 'nikitovsky'].includes(role);

  if (!canViewArchive) {
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
        <CardTitle>Архив документов</CardTitle>
        <CardDescription>Все выданные товары хранятся здесь навсегда</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {items.map(item => (
            <div key={item.id} className="p-4 border rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium">{item.itemDescription}</p>
                  <p className="text-sm text-muted-foreground">QR: {item.qrNumber}</p>
                </div>
                <Icon name="CheckCircle" className="text-green-600" />
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Клиент</p>
                  <p>{item.clientName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Телефон</p>
                  <p>{item.clientPhone}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Принято</p>
                  <p>{new Date(item.depositDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Выдано</p>
                  <p>{item.returnedDate ? new Date(item.returnedDate).toLocaleDateString() : '—'}</p>
                </div>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Архив пуст</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
