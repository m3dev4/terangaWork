import React from 'react';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Lock } from 'lucide-react';
import { Button } from '../ui/button';
import { useNavigate } from 'react-router-dom';

const NewPasswordComponent = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-start justify-start w-full mt-4">
      <form noValidate className="space-y-4 w-full">
        <div className="flex flex-col space-y-1.5">
          <Label
            htmlFor="password"
            className="text-xs sm:text-sm text-brand-ink font-medium"
          >
            Nouveau mot de passe
          </Label>
          <div className="relative">
            <Lock
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <Input
              id="password"
              className="w-full bg-brand-canvas border border-border focus:border-brand-violet focus:bg-white text-xs sm:text-sm pl-9 pr-3 py-2.5 rounded-lg transition-colors placeholder:text-muted-foreground"
              placeholder="••••••••••••"
              type="password"
            />
          </div>
        </div>

        <div className="flex flex-col space-y-1.5">
          <Label
            htmlFor="confirmPassword"
            className="text-xs sm:text-sm text-brand-ink font-medium"
          >
            Confirmer le nouveau mot de passe
          </Label>
          <div className="relative">
            <Lock
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <Input
              id="confirmPassword"
              className="w-full bg-brand-canvas border border-border focus:border-brand-violet focus:bg-white text-xs sm:text-sm pl-9 pr-3 py-2.5 rounded-lg transition-colors placeholder:text-muted-foreground"
              placeholder="••••••••••••"
              type="password"
            />
          </div>
        </div>

        <div className="pt-1">
          <Button
            type="submit"
            className="w-full h-11 bg-brand-green hover:bg-brand-green-hover text-brand-ink font-semibold rounded-lg shadow-xs transition-colors cursor-pointer text-xs sm:text-sm"
          >
            Réinitialiser le mot de passe
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NewPasswordComponent;
