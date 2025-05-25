"use client";
import { useState, useEffect } from \'react\';
import { useForm } from \'react-hook-form\';
import { zodResolver } from \'@hookform/resolvers/zod\';
import { z } from \'zod\';
import { useRouter } from \'next/navigation\';
import { createClient } from \'@/lib/supabase/client\';
import RoleGuard from \'@/components/auth/role-guard\';

const productTypeSchema = z.object({
  name: z.string().min(2, \'اسم نوع المنتج مطلوب ويجب أن يكون حرفين على الأقل\'),
  description: z.string().optional(),
});

type ProductTypeFormValues = z.infer<typeof productTypeSchema>;

export default function AddProductTypePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductTypeFormValues>({
    resolver: zodResolver(productTypeSchema),
    defaultValues: {
      name: \'\',
      description: \'\',
    },
  });

  const onSubmit = async (data: ProductTypeFormValues) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const supabase = createClient();
      
      // إنشاء نوع المنتج في قاعدة البيانات
      const { error: insertError } = await supabase
        .from(\'product_types\')
        .insert({
          name: data.name,
          description: data.description || null,
        });
        
      if (insertError) {
        throw new Error(insertError.message);
      }
      
      router.push(\'/dashboard/product-types\');
    } catch (err: any) {
      setError(err.message || \'حدث خطأ أثناء إنشاء نوع المنتج\');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <RoleGuard allowedRoles={[\'admin\', \'branch_manager\']}>
      <div className=\