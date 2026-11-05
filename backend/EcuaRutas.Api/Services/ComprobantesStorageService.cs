
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;

namespace EcuaRutas.Api.Services;

public class ComprobantesStorageService
{
    private readonly string _directorio;

    public ComprobantesStorageService(IHostEnvironment environment)
    {
        _directorio = Path.Combine(
            environment.ContentRootPath,
            "Storage",
            "Comprobantes"
        );
    }


private const long TamanoMaximo = 5 * 1024 * 1024;

public async Task<string> GuardarAsync(IFormFile archivo)
{
    if (archivo == null || archivo.Length == 0)
    {
        throw new ArgumentException(
            "Debes seleccionar un comprobante.");
    }

    if (archivo.Length > TamanoMaximo)
    {
        throw new ArgumentException(
            "El comprobante no puede superar los 5 MB.");
    }

    var extension = Path.GetExtension(
        archivo.FileName).ToLowerInvariant();

    var tiposPermitidos = new Dictionary<string, string>
    {
        [".jpg"] = "image/jpeg",
        [".jpeg"] = "image/jpeg",
        [".png"] = "image/png",
        [".pdf"] = "application/pdf"
    };

    if (!tiposPermitidos.TryGetValue(
            extension, out var tipoEsperado) ||
        archivo.ContentType != tipoEsperado)
    {
        throw new ArgumentException(
            "Solo se permiten archivos JPG, PNG o PDF.");
    }

    await using var entrada = archivo.OpenReadStream();

    var firma = new byte[8];
    var leidos = 0;

    while (leidos < firma.Length)
    {
        var cantidad = await entrada.ReadAsync(
            firma.AsMemory(leidos, firma.Length - leidos));

        if (cantidad == 0)
            break;

        leidos += cantidad;
    }

    bool firmaValida = extension switch
    {
        ".jpg" or ".jpeg" =>
            leidos >= 3 &&
            firma[0] == 0xFF &&
            firma[1] == 0xD8 &&
            firma[2] == 0xFF,

        ".png" =>
            leidos >= 8 &&
            firma.Take(8).SequenceEqual(
                new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 }),

        ".pdf" =>
            leidos >= 5 &&
            firma.Take(5).SequenceEqual(
                new byte[] { 37, 80, 68, 70, 45 }),

        _ => false
    };

    if (!firmaValida)
    {
        throw new ArgumentException(
            "El contenido del archivo no corresponde a su formato.");
    }

    Directory.CreateDirectory(_directorio);

    var nombreArchivo = $"{Guid.NewGuid():N}{extension}";
    var rutaCompleta = Path.Combine(
        _directorio, nombreArchivo);

    entrada.Position = 0;


    try
    {
        await using (var salida = new FileStream(
            rutaCompleta,
            FileMode.CreateNew,
            FileAccess.Write,
            FileShare.None,
            81920,
            useAsync: true))
        {
            await entrada.CopyToAsync(salida);
            await salida.FlushAsync();
        }

        return nombreArchivo;
    }
    catch
    {
        try
        {
            if (File.Exists(rutaCompleta))
            {
                File.Delete(rutaCompleta);
            }
        }
        catch (IOException)
        {
            // Conservamos el error original de la subida.
        }
        catch (UnauthorizedAccessException)
        {
            // Conservamos el error original de la subida.
        }

        throw;
    }

}

    public void Eliminar(string nombreArchivo)
    {
        if (string.IsNullOrWhiteSpace(nombreArchivo))
        {
            return;
        }


        if (Path.GetFileName(nombreArchivo) != nombreArchivo)
        {
            throw new ArgumentException(
                "El nombre del archivo no es válido.");
        }

        var rutaCompleta = Path.Combine(
            _directorio,
            nombreArchivo
        );

        if (File.Exists(rutaCompleta))
        {
            File.Delete(rutaCompleta);
        }
    }

}
