"use client";
import { useState, useEffect } from \'react\';
import { useForm } from \'react-hook-form\';
import { zodResolver } from \'@hookform/resolvers/zod\';
import { z } from \'zod\';
import { useRouter } from \'next/navigation\';
import { createClient } from \'@/lib/supabase/client\';
import { Category, ProductType } from \'@/types\';
import RoleGuard from \'@/components/auth/role-guard\';

const productSchema = z.object({
  name: z.string().min(3, \'اسم المنتج مطلوب ويجب أن يكون 3 أحرف على الأقل\'),
  barcode: z.string().optional(),
  description: z.string().optional(),
  category_id: z.string().min(1, \'يرجى اختيار تصنيف\'),
  product_type_id: z.string().min(1, \'يرجى اختيار نوع المنتج\'),
  unit: z.string().min(1, \'وحدة القياس مطلوبة\'),
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function AddProductPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const router = useRouter();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: \'\',
      barcode: \'\',
      description: \'\',
      unit: \'قطعة\',
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = createClient();
        
        // Fetch categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from(\'categories\')
          .select(\'*\')
          .order(\'name\', { ascending: true });
          
        if (categoriesError) {
          throw new Error(categoriesError.message);
        }
        
        // Fetch product types
        const { data: typesData, error: typesError } = await supabase
          .from(\'product_types\')
          .select(\'*\')
          .order(\'name\', { ascending: true });
          
        if (typesError) {
          throw new Error(typesError.message);
        }
        
        setCategories(categoriesData || []);
        setProductTypes(typesData || []);
      } catch (err: any) {
        console.error(\'Error fetching data:\', err.message);
      }
    };
    
    fetchData();
  }, []);

  const generateSKU = async (name: string, categoryId: string, productTypeId: string) => {
    // الحصول على الحروف الأولى من اسم المنتج
    const namePrefix = name.substring(0, 2).toUpperCase();
    
    // الحصول على الحروف الأولى من التصنيف
    const category = categories.find(c => c.id === categoryId);
    const categoryPrefix = category ? category.name.substring(0, 2).toUpperCase() : \'XX\';
    
    // الحصول على الحروف الأولى من نوع المنتج
    const productType = productTypes.find(t => t.id === productTypeId);
    const typePrefix = productType ? productType.name.substring(0, 2).toUpperCase() : \'XX\';
    
    // إنشاء رقم عشوائي من 4 أرقام
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    
    // تجميع SKU
    return `${namePrefix}${categoryPrefix}${typePrefix}${randomNum}`;
  };

  const onSubmit = async (data: ProductFormValues) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const supabase = createClient();
      
      // توليد SKU للمنتج
      const sku = await generateSKU(data.name, data.category_id, data.product_type_id);
      
      // إنشاء المنتج في قاعدة البيانات
      const { error: insertError } = await supabase
        .from(\'products\')
        .insert({
          name: data.name,
          sku,
          barcode: data.barcode || null,
          description: data.description || null,
          category_id: data.category_id,
          product_type_id: data.product_type_id,
          unit: data.unit,
        });
        
      if (insertError) {
        throw new Error(insertError.message);
      }
      
      router.push(\'/dashboard/products\');
    } catch (err: any) {
      setError(err.message || \'حدث خطأ أثناء إنشاء المنتج\');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <RoleGuard allowedRoles={[\'admin\', \'branch_manager\']}>
      <div className=\