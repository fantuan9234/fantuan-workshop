<?php
namespace App\Filament\Resources\MessageResource\Pages;

use App\Filament\Resources\MessageResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditMessage extends EditRecord
{
    protected static string $resource = MessageResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make(),
        ];
    }

    protected function mutateFormDataBeforeSave(array $data): array
    {
        if ($data['read_at']) {
            $data['read_at'] = now();
        }
        return $data;
    }
}