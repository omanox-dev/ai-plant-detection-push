-- Create user profiles table
CREATE TABLE public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    email TEXT,
    location TEXT,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create plant analyses table
CREATE TABLE public.plant_analyses (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    plant_name TEXT,
    health_score INTEGER,
    has_disease BOOLEAN DEFAULT false,
    disease_name TEXT,
    confidence DECIMAL(5,2),
    severity TEXT CHECK (severity IN ('low', 'medium', 'high')),
    symptoms TEXT[],
    recommendations TEXT[],
    analysis_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on plant_analyses
ALTER TABLE public.plant_analyses ENABLE ROW LEVEL SECURITY;

-- Create policies for plant_analyses
CREATE POLICY "Users can view their own analyses" 
ON public.plant_analyses 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own analyses" 
ON public.plant_analyses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analyses" 
ON public.plant_analyses 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analyses" 
ON public.plant_analyses 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create saved plants table
CREATE TABLE public.saved_plants (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plant_name TEXT NOT NULL,
    plant_type TEXT,
    description TEXT,
    image_url TEXT,
    location TEXT,
    care_notes TEXT,
    last_health_check TIMESTAMP WITH TIME ZONE,
    health_status TEXT CHECK (health_status IN ('healthy', 'needs_attention', 'sick')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on saved_plants
ALTER TABLE public.saved_plants ENABLE ROW LEVEL SECURITY;

-- Create policies for saved_plants
CREATE POLICY "Users can view their own saved plants" 
ON public.saved_plants 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved plants" 
ON public.saved_plants 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved plants" 
ON public.saved_plants 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved plants" 
ON public.saved_plants 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create care reminders table
CREATE TABLE public.care_reminders (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    saved_plant_id UUID REFERENCES public.saved_plants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    reminder_type TEXT CHECK (reminder_type IN ('watering', 'fertilizing', 'pruning', 'inspection', 'custom')),
    frequency_days INTEGER NOT NULL DEFAULT 7,
    next_due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on care_reminders
ALTER TABLE public.care_reminders ENABLE ROW LEVEL SECURITY;

-- Create policies for care_reminders
CREATE POLICY "Users can view their own care reminders" 
ON public.care_reminders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own care reminders" 
ON public.care_reminders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own care reminders" 
ON public.care_reminders 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own care reminders" 
ON public.care_reminders 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create storage bucket for plant images
INSERT INTO storage.buckets (id, name, public) VALUES ('plant-images', 'plant-images', true);

-- Create storage policies for plant images
CREATE POLICY "Users can view plant images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'plant-images');

CREATE POLICY "Users can upload their own plant images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'plant-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own plant images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'plant-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own plant images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'plant-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_saved_plants_updated_at
    BEFORE UPDATE ON public.saved_plants
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_care_reminders_updated_at
    BEFORE UPDATE ON public.care_reminders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, display_name, email)
    VALUES (NEW.id, NEW.raw_user_meta_data ->> 'display_name', NEW.email);
    RETURN NEW;
END;
$$;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();